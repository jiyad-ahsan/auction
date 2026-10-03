-- Pilot mode, custody, invites, tags and post-auction sales.
--
-- Pilot mode (the co-founders' MVP): invite-only, phone + email verified to bid,
-- staff-assigned bid limits instead of deposits, CNIC required before collection.
-- Custody: Nilaam holds every watch before it is listed and every rupee until
-- handover, so the value always flows through the platform.

-- ---------------------------------------------------------------------------
-- Platform settings (a single row)
-- ---------------------------------------------------------------------------

create table app_settings (
  id                        boolean primary key default true check (id),
  pilot_mode                boolean not null default true,
  invite_only               boolean not null default true,
  baseline_sell_through_pct numeric(5,2) check (baseline_sell_through_pct between 0 and 100),
  updated_at                timestamptz not null default now()
);
insert into app_settings default values;

-- ---------------------------------------------------------------------------
-- Invites (one per WhatsApp group or channel, so results can be traced back)
-- ---------------------------------------------------------------------------

create table invites (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique check (code ~ '^[A-Z0-9-]{4,32}$'),
  label             text not null,
  default_bid_limit bigint not null default 0 check (default_bid_limit >= 0),
  max_uses          int check (max_uses is null or max_uses > 0),
  uses              int not null default 0,
  active            boolean not null default true,
  created_by        uuid references users(id),
  created_at        timestamptz not null default now()
);

alter table users
  add column invite_id         uuid references invites(id),
  add column email_verified_at timestamptz,
  add column assigned_limit    bigint not null default 0 check (assigned_limit >= 0);

create table email_codes (
  id          bigserial primary key,
  user_id     uuid not null references users(id) on delete cascade,
  email       text not null,
  code_hash   text not null,
  expires_at  timestamptz not null,
  attempts    int not null default 0,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);
create index email_codes_user_idx on email_codes (user_id, created_at desc);

-- Bid limit = staff-assigned limit (pilot) + 20x confirmed deposits (later).
create or replace function recalc_bid_limit(p_user uuid) returns bigint language plpgsql as $$
declare
  v_limit bigint;
begin
  select coalesce((select sum(amount) from deposits where user_id = p_user and status = 'confirmed'), 0)
           * 10000 / deposit_ratio_bps()
       + (select assigned_limit from users where id = p_user)
    into v_limit;
  update users set bid_limit = v_limit where id = p_user;
  return v_limit;
end $$;

-- ---------------------------------------------------------------------------
-- Custody: the watch is with us before it can be listed
-- ---------------------------------------------------------------------------

alter table watches
  add column custody_status      text not null default 'with_consignor'
    check (custody_status in ('with_consignor', 'in_custody', 'released_to_buyer', 'returned_to_consignor')),
  add column custody_location    text,
  add column custody_received_at timestamptz,
  add column custody_released_at timestamptz;

create table custody_events (
  id         bigserial primary key,
  watch_id   uuid not null references watches(id),
  event      text not null check (event in ('received', 'moved', 'released_to_buyer', 'returned_to_consignor')),
  location   text,
  note       text,
  actor_id   uuid references users(id),
  created_at timestamptz not null default now()
);
create index custody_events_watch_idx on custody_events (watch_id, created_at);

-- The consignor's written agreement that nobody connected to them bids.
alter table consignors add column no_shill_agreed_at timestamptz;

-- ---------------------------------------------------------------------------
-- Lots: per-lot late-bid extension and how a sale happened
-- ---------------------------------------------------------------------------

alter table lots
  add column extension_seconds int not null default 300 check (extension_seconds between 60 and 1800),
  add column sold_via          text check (sold_via in ('auction', 'post_auction'));

-- A lot can only go live when the watch is in our custody and the consignor has
-- signed the no-shill agreement.
create or replace function enforce_publish_rules() returns trigger language plpgsql as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    if not exists (select 1 from watches where id = new.watch_id and custody_status = 'in_custody') then
      raise exception 'WATCH_NOT_IN_CUSTODY';
    end if;
    if not exists (
      select 1 from watches w join consignors c on c.id = w.consignor_id
       where w.id = new.watch_id and c.no_shill_agreed_at is not null
    ) then
      raise exception 'NO_SHILL_AGREEMENT_MISSING';
    end if;
  end if;
  return new;
end $$;
create trigger lots_publish_rules before insert or update of status on lots
  for each row execute function enforce_publish_rules();

-- ---------------------------------------------------------------------------
-- Tags (a list the team grows over time)
-- ---------------------------------------------------------------------------

create table tags (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  label       text not null,
  description text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table watch_tags (
  watch_id uuid not null references watches(id) on delete cascade,
  tag_id   uuid not null references tags(id) on delete cascade,
  primary key (watch_id, tag_id)
);
create index watch_tags_tag_idx on watch_tags (tag_id);

insert into tags (slug, label, description) values
  ('watch-only',      'Watch only',      'No box or papers'),
  ('box-and-papers',  'Box & papers',    'Original box and papers included'),
  ('patina',          'Patina',          'Aged dial or lume, left original'),
  ('unpolished',      'Unpolished case', 'Case has not been polished'),
  ('service-history', 'Service history', 'Documented service records');

-- ---------------------------------------------------------------------------
-- Bidding: pilot-aware identity check and per-lot extension
-- ---------------------------------------------------------------------------

create or replace function place_bid(p_lot uuid, p_bidder uuid, p_max bigint, p_key text default null)
returns jsonb language plpgsql as $$
declare
  v_lot        lots%rowtype;
  v_user       users%rowtype;
  v_now        timestamptz := now();
  v_min_ok     bigint;
  v_price      bigint;
  v_prev_leader uuid;
  v_prev_max   bigint;
  v_outcome    text;
  v_existing   bigint;
  v_pilot      boolean;
  v_window     interval;
begin
  if p_max is null or p_max <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select * into v_lot from lots where id = p_lot for update;
  if not found then
    raise exception 'LOT_NOT_FOUND';
  end if;

  if p_key is not null then
    select id into v_existing from bids where bidder_id = p_bidder and idempotency_key = p_key;
    if found then
      return jsonb_build_object('outcome', 'duplicate', 'lot_id', v_lot.id,
        'current_price', v_lot.current_price, 'leader_id', v_lot.leader_id,
        'ends_at', v_lot.ends_at, 'bid_count', v_lot.bid_count);
    end if;
  end if;

  if v_lot.status <> 'published' or v_now < v_lot.starts_at then
    raise exception 'LOT_NOT_OPEN';
  end if;
  if v_now >= v_lot.ends_at then
    raise exception 'LOT_CLOSED';
  end if;

  select * into v_user from users where id = p_bidder;
  if not found then
    raise exception 'BIDDER_NOT_FOUND';
  end if;
  if v_user.suspended then
    raise exception 'BIDDER_SUSPENDED';
  end if;

  -- Pilot: verified phone (sign-in) + verified email. Full mode: CNIC-verified.
  select pilot_mode into v_pilot from app_settings;
  if coalesce(v_pilot, false) then
    if v_user.email_verified_at is null then
      raise exception 'EMAIL_UNVERIFIED';
    end if;
  elsif v_user.kyc_status <> 'approved' then
    raise exception 'KYC_REQUIRED';
  end if;

  if exists (
    select 1 from watches w join consignors c on c.id = w.consignor_id
     where w.id = v_lot.watch_id and (c.user_id = p_bidder or c.phone = v_user.phone)
  ) then
    raise exception 'SELLER_CANNOT_BID';
  end if;

  if p_max > v_user.bid_limit - bidder_exposure(p_bidder, p_lot) then
    raise exception 'BID_LIMIT_EXCEEDED';
  end if;

  v_prev_leader := v_lot.leader_id;
  v_prev_max    := v_lot.leader_max;

  if v_lot.leader_id is null then
    if p_max < v_lot.starting_price then
      raise exception 'BID_TOO_LOW';
    end if;
    v_lot.leader_id := p_bidder;
    v_lot.leader_max := p_max;
    v_price := v_lot.starting_price;
    v_outcome := 'leading';

  elsif v_lot.leader_id = p_bidder then
    if p_max <= v_lot.leader_max then
      raise exception 'MAX_NOT_HIGHER';
    end if;
    v_lot.leader_max := p_max;
    v_price := v_lot.current_price;
    v_outcome := 'max_increased';

  else
    v_min_ok := v_lot.current_price + bid_increment(v_lot.current_price);
    if p_max < v_min_ok then
      raise exception 'BID_TOO_LOW';
    end if;

    if p_max > v_lot.leader_max then
      v_price := least(p_max, v_lot.leader_max + bid_increment(v_lot.leader_max));
      v_lot.leader_id := p_bidder;
      v_lot.leader_max := p_max;
      v_outcome := 'leading';
    else
      v_price := least(v_lot.leader_max, p_max + bid_increment(p_max));
      v_outcome := 'outbid';
    end if;
  end if;

  if v_lot.reserve_price is not null and v_lot.leader_max >= v_lot.reserve_price and v_price < v_lot.reserve_price then
    v_price := v_lot.reserve_price;
  end if;

  -- Late-bid extension: a bid inside the lot's window resets the end to now + window.
  v_window := make_interval(secs => v_lot.extension_seconds);
  if v_lot.ends_at - v_now < v_window
     and (v_outcome <> 'max_increased' or v_price is distinct from v_lot.current_price) then
    v_lot.ends_at := v_now + v_window;
  end if;

  if v_outcome = 'max_increased' then
    insert into bids (lot_id, bidder_id, amount, max_amount, kind, idempotency_key, created_at)
    values (p_lot, p_bidder, v_price, p_max, 'max_increase', p_key, v_now);
  elsif v_outcome = 'outbid' then
    insert into bids (lot_id, bidder_id, amount, max_amount, kind, idempotency_key, created_at)
    values (p_lot, p_bidder, p_max, p_max, 'manual', p_key, v_now);
    insert into bids (lot_id, bidder_id, amount, kind, created_at)
    values (p_lot, v_lot.leader_id, v_price, 'proxy', v_now);
  else
    if v_prev_leader is not null and v_prev_max > v_lot.current_price then
      insert into bids (lot_id, bidder_id, amount, kind, created_at)
      values (p_lot, v_prev_leader, v_prev_max, 'proxy', v_now);
    end if;
    insert into bids (lot_id, bidder_id, amount, max_amount, kind, idempotency_key, created_at)
    values (p_lot, p_bidder, v_price, p_max, 'manual', p_key, v_now);
  end if;

  update lots set
    current_price = v_price,
    leader_id     = v_lot.leader_id,
    leader_max    = v_lot.leader_max,
    ends_at       = v_lot.ends_at,
    bid_count     = bid_count + case when v_outcome = 'max_increased' then 0 else 1 end
  where id = p_lot;

  return jsonb_build_object(
    'outcome', v_outcome,
    'lot_id', p_lot,
    'current_price', v_price,
    'leader_id', v_lot.leader_id,
    'ends_at', v_lot.ends_at,
    'reserve_met', v_lot.reserve_price is null or v_price >= v_lot.reserve_price,
    'displaced_leader_id', case when v_outcome = 'leading' and v_prev_leader is distinct from p_bidder then v_prev_leader end
  );
end $$;

-- ---------------------------------------------------------------------------
-- Closing and post-auction sales (both create the invoice and settlement)
-- ---------------------------------------------------------------------------

create or replace function create_sale(p_lot uuid, p_buyer uuid, p_price bigint, p_via text) returns void language plpgsql as $$
declare
  v_lot lots%rowtype;
  v_bp  bigint;
  v_fee bigint;
  v_consignor uuid;
begin
  select * into v_lot from lots where id = p_lot;
  v_bp  := buyer_premium(p_price, v_lot.buyer_premium_bps, v_lot.buyer_premium_min);
  v_fee := (p_price * v_lot.seller_fee_bps + 5000) / 10000;
  select consignor_id into v_consignor from watches where id = v_lot.watch_id;

  update lots set status = 'closed', result = 'sold', sold_via = p_via, closed_at = coalesce(closed_at, now()) where id = p_lot;
  update watches set status = 'sold' where id = v_lot.watch_id;
  insert into invoices (lot_id, buyer_id, hammer, buyer_premium, total, due_at)
  values (p_lot, p_buyer, p_price, v_bp, p_price + v_bp, now() + interval '3 days');
  insert into settlements (lot_id, consignor_id, hammer, seller_fee, net_payout)
  values (p_lot, v_consignor, p_price, v_fee, p_price - v_fee);
end $$;

create or replace function close_due_lots() returns int language plpgsql as $$
declare
  v_lot   lots%rowtype;
  v_count int := 0;
begin
  for v_lot in
    select * from lots where status = 'published' and ends_at <= now()
    order by ends_at for update skip locked
  loop
    if v_lot.ends_at > now() then
      continue;
    end if;

    if v_lot.leader_id is not null
       and (v_lot.reserve_price is null or v_lot.current_price >= v_lot.reserve_price) then
      perform create_sale(v_lot.id, v_lot.leader_id, v_lot.current_price, 'auction');
    else
      update lots set status = 'closed', result = 'unsold', closed_at = now() where id = v_lot.id;
      update watches set status = 'approved' where id = v_lot.watch_id;
    end if;

    insert into audit_log (action, entity, entity_id, data)
    values ('lot.closed', 'lot', v_lot.id::text,
            jsonb_build_object('price', v_lot.current_price, 'leader_id', v_lot.leader_id, 'reserve', v_lot.reserve_price));
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- A deal agreed after a lot missed its reserve still runs through Nilaam:
-- same invoice, same client account, same custody handover.
create or replace function record_post_auction_sale(p_lot uuid, p_buyer uuid, p_price bigint, p_actor uuid)
returns void language plpgsql as $$
declare
  v_lot lots%rowtype;
begin
  select * into v_lot from lots where id = p_lot for update;
  if not found or v_lot.status <> 'closed' or v_lot.result <> 'unsold' then
    raise exception 'LOT_NOT_UNSOLD';
  end if;
  if p_price is null or p_price <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;
  if not exists (select 1 from bids where lot_id = p_lot and bidder_id = p_buyer) then
    raise exception 'BUYER_DID_NOT_BID';
  end if;
  perform create_sale(p_lot, p_buyer, p_price, 'post_auction');
  insert into audit_log (actor_id, action, entity, entity_id, data)
  values (p_actor, 'lot.post_auction_sale', 'lot', p_lot::text, jsonb_build_object('buyer_id', p_buyer, 'price', p_price));
end $$;
