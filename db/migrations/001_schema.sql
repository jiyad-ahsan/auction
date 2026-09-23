-- Core schema for the watches MVP.
-- All money is stored as whole PKR in bigint columns.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

create table users (
  id               uuid primary key default gen_random_uuid(),
  phone            text not null unique,              -- E.164, e.g. +923001234567
  full_name        text,
  handle           text unique,                       -- the only identity shown publicly
  email            text,
  role             text not null default 'bidder' check (role in ('bidder', 'staff', 'admin')),
  kyc_status       text not null default 'none' check (kyc_status in ('none', 'pending', 'approved', 'rejected')),
  cnic_encrypted   text,                              -- AES-GCM ciphertext, see src/lib/crypto.ts
  cnic_last4       text,
  kyc_submitted_at timestamptz,
  kyc_reviewed_at  timestamptz,
  kyc_reviewed_by  uuid references users(id),
  kyc_notes        text,
  bid_limit        bigint not null default 0 check (bid_limit >= 0),
  suspended        boolean not null default false,
  created_at       timestamptz not null default now()
);

create table otp_codes (
  id          bigserial primary key,
  phone       text not null,
  code_hash   text not null,
  expires_at  timestamptz not null,
  attempts    int not null default 0,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);
create index otp_codes_phone_idx on otp_codes (phone, created_at desc);

create table sessions (
  token_hash text primary key,
  user_id    uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index sessions_user_idx on sessions (user_id);

-- Refundable bidder deposits. A confirmed deposit raises the bidder's bid limit
-- (see recalc_bid_limit). Deposits are paid by Raast / IBFT / pay order into the
-- segregated client-money account and confirmed by staff against the bank statement.
create table deposits (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id),
  amount       bigint not null check (amount > 0),
  method       text not null check (method in ('raast', 'ibft', 'pay_order')),
  reference    text not null,
  status       text not null default 'pending' check (status in ('pending', 'confirmed', 'refunded', 'forfeited', 'rejected')),
  notes        text,
  created_at   timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by uuid references users(id),
  closed_at    timestamptz,
  closed_by    uuid references users(id)
);
create index deposits_user_idx on deposits (user_id);

-- Sellers. A consignor may or may not have a bidder account; when they do,
-- user_id links it so they can never bid on their own lots.
create table consignors (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid references users(id),
  name                   text not null,
  phone                  text not null,
  cnic_last4             text,
  payout_account_encrypted text,
  notes                  text,
  created_at             timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Watches and their authentication
-- ---------------------------------------------------------------------------

create table watches (
  id               uuid primary key default gen_random_uuid(),
  consignor_id     uuid not null references consignors(id),
  brand            text not null,
  model            text not null,
  reference        text not null,
  serial_private   text,                              -- staff only; never rendered publicly
  year             int,
  case_material    text,
  case_diameter_mm numeric(4,1),
  movement         text check (movement in ('automatic', 'manual', 'quartz')),
  calibre          text,
  dial             text,
  bracelet         text,
  has_box          boolean not null default false,
  has_papers       boolean not null default false,
  papers_date      date,
  service_history  text,
  description      text,
  status           text not null default 'intake'
                   check (status in ('intake', 'authenticating', 'approved', 'rejected', 'listed', 'sold', 'returned')),
  created_at       timestamptz not null default now()
);

-- Condition grade uses a Japanese-auction-sheet style scale Pakistani buyers already know:
--   S = unworn / as new, A = excellent, B = very good, C = good (visible wear), D = fair (needs work)
create table authentication_reports (
  id                 uuid primary key default gen_random_uuid(),
  watch_id           uuid not null unique references watches(id) on delete cascade,
  specialist         text not null,
  inspected_at       date not null,
  verdict            text not null check (verdict in ('authentic', 'not_authentic', 'inconclusive')),
  condition_grade    text not null check (condition_grade in ('S', 'A', 'B', 'C', 'D')),
  case_notes         text,
  dial_notes         text,
  bracelet_notes     text,
  movement_notes     text,
  rate_s_per_day     numeric(5,1),                    -- timegrapher, dial up
  amplitude_deg      int,
  beat_error_ms      numeric(4,1),
  water_tested       boolean,
  aftermarket_parts  text,                            -- 'None' when fully original
  checks             jsonb not null default '[]',     -- [{ "name": "...", "result": "pass|fail|na", "note": "..." }]
  created_at         timestamptz not null default now()
);

create table media (
  id       uuid primary key default gen_random_uuid(),
  watch_id uuid not null references watches(id) on delete cascade,
  url      text not null,
  alt      text,
  position int not null default 0
);
create index media_watch_idx on media (watch_id, position);

-- ---------------------------------------------------------------------------
-- Sales, lots, bids
-- ---------------------------------------------------------------------------

create table sales (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  created_at  timestamptz not null default now()
);

create table lots (
  id                 uuid primary key default gen_random_uuid(),
  lot_number         serial unique,
  sale_id            uuid references sales(id),
  watch_id           uuid not null references watches(id),
  status             text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  result             text check (result in ('sold', 'unsold')),
  starting_price     bigint not null check (starting_price > 0),
  reserve_price      bigint check (reserve_price is null or reserve_price >= starting_price),
  starts_at          timestamptz not null,
  ends_at            timestamptz not null,
  scheduled_ends_at  timestamptz not null,            -- ends_at before any soft-close extensions
  current_price      bigint,
  leader_id          uuid references users(id),
  leader_max         bigint,                          -- private
  bid_count          int not null default 0,
  buyer_premium_bps  int not null default 750,        -- 7.5%
  buyer_premium_min  bigint not null default 15000,
  seller_fee_bps     int not null default 500,        -- 5%
  closed_at          timestamptz,
  created_at         timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index lots_status_ends_idx on lots (status, ends_at);
-- An unsold watch can be relisted, but only one open lot per watch at a time.
create unique index lots_one_open_per_watch on lots (watch_id) where status <> 'closed';

-- Append-only. Every visible bid and every proxy response is a row, so any lot's
-- outcome can be replayed and audited.
create table bids (
  id              bigserial primary key,
  lot_id          uuid not null references lots(id),
  bidder_id       uuid not null references users(id),
  amount          bigint not null,                    -- public amount for this bid event
  max_amount      bigint,                             -- private proxy ceiling (manual bids only)
  kind            text not null check (kind in ('manual', 'proxy', 'max_increase')),
  idempotency_key text,
  created_at      timestamptz not null default now()
);
create index bids_lot_idx on bids (lot_id, id);
create unique index bids_idempotency_idx on bids (bidder_id, idempotency_key) where idempotency_key is not null;

create or replace function forbid_bid_mutation() returns trigger language plpgsql as $$
begin
  raise exception 'bids are append-only';
end $$;
create trigger bids_append_only before update or delete on bids
  for each row execute function forbid_bid_mutation();

create table watchlist (
  user_id    uuid not null references users(id) on delete cascade,
  lot_id     uuid not null references lots(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, lot_id)
);

-- ---------------------------------------------------------------------------
-- Money after the hammer
-- ---------------------------------------------------------------------------

create table invoices (
  id             uuid primary key default gen_random_uuid(),
  lot_id         uuid not null unique references lots(id),
  buyer_id       uuid not null references users(id),
  hammer         bigint not null,
  buyer_premium  bigint not null,
  total          bigint not null,
  due_at         timestamptz not null,
  status         text not null default 'unpaid' check (status in ('unpaid', 'paid', 'defaulted', 'void')),
  paid_at        timestamptz,
  payment_method text,
  payment_reference text,
  confirmed_by   uuid references users(id),
  handed_over_at timestamptz,
  winner_notified_at timestamptz,
  created_at     timestamptz not null default now()
);

create table settlements (
  id           uuid primary key default gen_random_uuid(),
  lot_id       uuid not null unique references lots(id),
  consignor_id uuid not null references consignors(id),
  hammer       bigint not null,
  seller_fee   bigint not null,
  net_payout   bigint not null,
  status       text not null default 'pending' check (status in ('pending', 'paid', 'void')),
  paid_at      timestamptz,
  reference    text,
  created_at   timestamptz not null default now()
);

create table audit_log (
  id         bigserial primary key,
  actor_id   uuid references users(id),
  action     text not null,
  entity     text not null,
  entity_id  text,
  data       jsonb,
  created_at timestamptz not null default now()
);

-- Inbound "sell a watch" enquiries from the public site.
create table consignment_requests (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  phone           text not null,
  city            text,
  brand           text not null,
  model           text,
  reference       text,
  year            int,
  box_papers      text,
  expected_price  bigint,
  notes           text,
  status          text not null default 'new' check (status in ('new', 'contacted', 'accepted', 'declined')),
  created_at      timestamptz not null default now()
);
