-- Bid engine, lot closing and bid-limit maintenance.
-- Errors are raised with SQLSTATE 'P0001' and a stable code as the message
-- (e.g. 'LOT_CLOSED'); src/lib/bidding.ts maps them to user-facing text.

-- Deposit ratio: bid limit = confirmed deposits / 5%.
create or replace function deposit_ratio_bps() returns int language sql immutable as $$ select 500 $$;

-- PKR increment table. Keep in sync with src/lib/money.ts (tests check parity).
create or replace function bid_increment(p_price bigint) returns bigint language sql immutable as $$
  select case
    when p_price <     50000 then    1000
    when p_price <    200000 then    2500
    when p_price <    500000 then    5000
    when p_price <   1000000 then   10000
    when p_price <   2500000 then   25000
    when p_price <   5000000 then   50000
    when p_price <  10000000 then  100000
    when p_price <  25000000 then  250000
    when p_price <  50000000 then  500000
    else 1000000
  end::bigint
$$;

create or replace function buyer_premium(p_hammer bigint, p_bps int, p_min bigint) returns bigint
language sql immutable as $$
  select greatest(p_min, (p_hammer * p_bps + 5000) / 10000)
$$;

create or replace function recalc_bid_limit(p_user uuid) returns bigint language plpgsql as $$
declare
  v_limit bigint;
begin
  select coalesce(sum(amount), 0) * 10000 / deposit_ratio_bps()
    into v_limit
    from deposits where user_id = p_user and status = 'confirmed';
  update users set bid_limit = v_limit where id = p_user;
  return v_limit;
end $$;

-- Exposure: what a bidder could owe if every lot they currently lead closed now,
-- plus unpaid invoices. A new max bid must fit within bid_limit - exposure.
create or replace function bidder_exposure(p_user uuid, p_exclude_lot uuid) returns bigint
language sql stable as $$
  select coalesce((select sum(leader_max) from lots
                    where leader_id = p_user and status = 'published'
                      and id is distinct from p_exclude_lot), 0)
       + coalesce((select sum(total) from invoices
                    where buyer_id = p_user and status = 'unpaid'), 0)
$$;

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
begin
  if p_max is null or p_max <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  -- Serialise all bids on this lot.
  select * into v_lot from lots where id = p_lot for update;
  if not found then
    raise exception 'LOT_NOT_FOUND';
  end if;

  -- Idempotent retries: same bidder + key returns the current state without re-bidding.
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
  if v_user.kyc_status <> 'approved' then
    raise exception 'KYC_REQUIRED';
  end if;

  -- Consignors may never bid on their own lots (linked account or same phone).
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
    -- Leader raising their own ceiling; public price only moves if this meets the reserve.
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
      -- New leader: price moves to one increment over the old leader's ceiling (capped at the new max).
      v_price := least(p_max, v_lot.leader_max + bid_increment(v_lot.leader_max));
      v_lot.leader_id := p_bidder;
      v_lot.leader_max := p_max;
      v_outcome := 'leading';
    else
      -- Existing leader's proxy defends. Ties go to the earlier bid.
      v_price := least(v_lot.leader_max, p_max + bid_increment(p_max));
      v_outcome := 'outbid';
    end if;
  end if;

  -- Once a ceiling covers the reserve, the price jumps to the reserve.
  if v_lot.reserve_price is not null and v_lot.leader_max >= v_lot.reserve_price and v_price < v_lot.reserve_price then
    v_price := v_lot.reserve_price;
  end if;

  -- Soft close: a bid in the final 2 minutes pushes the end to now + 2 minutes.
  -- A leader privately raising their own max doesn't extend unless it moved the public price.
  if v_lot.ends_at - v_now < interval '2 minutes'
     and (v_outcome <> 'max_increased' or v_price is distinct from v_lot.current_price) then
    v_lot.ends_at := v_now + interval '2 minutes';
  end if;

  -- Bid log.
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
      -- Record the displaced leader's proxy climbing to their ceiling.
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

-- Finalise every published lot whose end time has passed. Correctness of bidding
-- does not depend on when this runs: place_bid rejects bids after ends_at anyway.
create or replace function close_due_lots() returns int language plpgsql as $$
declare
  v_lot   lots%rowtype;
  v_count int := 0;
  v_bp    bigint;
  v_fee   bigint;
  v_consignor uuid;
begin
  for v_lot in
    select * from lots where status = 'published' and ends_at <= now()
    order by ends_at for update skip locked
  loop
    -- Re-check under lock in case a late bid extended the end.
    if v_lot.ends_at > now() then
      continue;
    end if;

    if v_lot.leader_id is not null
       and (v_lot.reserve_price is null or v_lot.current_price >= v_lot.reserve_price) then
      v_bp  := buyer_premium(v_lot.current_price, v_lot.buyer_premium_bps, v_lot.buyer_premium_min);
      v_fee := (v_lot.current_price * v_lot.seller_fee_bps + 5000) / 10000;
      select consignor_id into v_consignor from watches where id = v_lot.watch_id;

      update lots set status = 'closed', result = 'sold', closed_at = now() where id = v_lot.id;
      update watches set status = 'sold' where id = v_lot.watch_id;
      insert into invoices (lot_id, buyer_id, hammer, buyer_premium, total, due_at)
      values (v_lot.id, v_lot.leader_id, v_lot.current_price, v_bp, v_lot.current_price + v_bp, now() + interval '3 days');
      insert into settlements (lot_id, consignor_id, hammer, seller_fee, net_payout)
      values (v_lot.id, v_consignor, v_lot.current_price, v_fee, v_lot.current_price - v_fee);
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
