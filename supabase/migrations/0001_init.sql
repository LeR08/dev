-- The Smoke Trail — initial schema.
--
-- Scope note: the public directory reads a build-time snapshot and does not
-- require this database to render. Supabase backs the write path — reviews,
-- reports and moderation — plus an optional server-side copy of the venues the
-- ETL publishes.

create extension if not exists "pgcrypto";
create extension if not exists "postgis";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------- venues ----
create table if not exists venues (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  -- Amsterdam is the only city in v1; the column exists so a second
  -- municipality is an ETL adapter rather than a migration.
  city              text not null default 'amsterdam',
  name              text not null,
  legal_name        text,
  address           text not null,
  postcode          text,
  neighbourhood     text,
  lat               double precision not null,
  lng               double precision not null,
  geom              geography(point, 4326) generated always as
                      (st_makepoint(lng, lat)::geography) stored,
  status            text not null default 'open'
                      check (status in ('open', 'closed', 'renamed', 'pending')),
  renamed_to        uuid references venues(id),
  licence_number    text,
  licence_valid_to  date,
  website           text,
  phone             text,
  amenities         jsonb not null default '{}',
  -- Outer bound permitted by the licence. Never displayed without its qualifier.
  hours_licensed    jsonb,
  -- Raw OSM opening_hours syntax, kept for provenance and re-expansion.
  hours_actual      text,
  -- Concrete intervals for the week the last ETL run covered.
  hours_weekly      jsonb,
  hours_source      text check (hours_source in ('community', 'osm', 'licence')),
  hours_updated_at  timestamptz,
  osm_id            text,
  amsterdam_id      text unique,
  -- Fields an admin has pinned; the ETL must not overwrite these.
  override_fields   text[] not null default '{}',
  -- Denormalised, recomputed whenever a review is written.
  rating_avg        numeric(2,1),
  rating_count      int not null default 0,
  sources           jsonb not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists venues_geom_idx on venues using gist (geom);
create index if not exists venues_status_idx on venues (status);
create index if not exists venues_city_idx on venues (city);
create index if not exists venues_name_trgm_idx on venues using gin (name gin_trgm_ops);

-- --------------------------------------------------------------- reviews ----
create table if not exists reviews (
  id           uuid primary key default gen_random_uuid(),
  venue_id     uuid not null references venues(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  rating       int not null check (rating between 1 and 5),
  body         text check (char_length(body) between 0 and 2000),
  visit_date   date,
  state        text not null default 'published'
                 check (state in ('published', 'pending', 'rejected', 'removed')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (venue_id, user_id)
);

create index if not exists reviews_venue_idx on reviews (venue_id, state);
create index if not exists reviews_user_idx on reviews (user_id);

-- --------------------------------------------------------------- reports ----
create table if not exists reports (
  id          uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('venue', 'review')),
  target_id   uuid not null,
  kind        text not null
                check (kind in ('wrong_hours', 'closed', 'wrong_address', 'spam', 'abuse', 'other')),
  message     text check (char_length(message) <= 1000),
  state       text not null default 'new' check (state in ('new', 'accepted', 'rejected')),
  created_at  timestamptz not null default now()
);

create index if not exists reports_state_idx on reports (state, created_at desc);

-- --------------------------------------------------- pending venues queue ----
-- OSM records inside the city bbox that no licence backs. Reviewed by hand;
-- never published automatically.
create table if not exists pending_venues (
  id         uuid primary key default gen_random_uuid(),
  osm_id     text unique not null,
  name       text not null,
  lat        double precision not null,
  lng        double precision not null,
  address    text,
  tags       jsonb not null default '{}',
  state      text not null default 'new' check (state in ('new', 'accepted', 'rejected')),
  first_seen timestamptz not null default now()
);

-- -------------------------------------------------------------- etl runs ----
create table if not exists etl_runs (
  id          uuid primary key default gen_random_uuid(),
  source      text not null,
  started_at  timestamptz not null,
  finished_at timestamptz,
  inserted    int not null default 0,
  updated     int not null default 0,
  unchanged   int not null default 0,
  closed      int not null default 0,
  pending     int not null default 0,
  errors      jsonb not null default '[]'
);

-- ------------------------------------------------------------------- RLS ----
alter table venues         enable row level security;
alter table reviews        enable row level security;
alter table reports        enable row level security;
alter table pending_venues enable row level security;
alter table etl_runs       enable row level security;

-- Venues are public facts.
drop policy if exists venues_public_read on venues;
create policy venues_public_read on venues for select using (true);

-- Only published reviews are visible; a moderator can see the rest through the
-- service role, which bypasses RLS.
drop policy if exists reviews_public_read on reviews;
create policy reviews_public_read on reviews for select using (state = 'published');

drop policy if exists reviews_owner_read on reviews;
create policy reviews_owner_read on reviews for select using (auth.uid() = user_id);

drop policy if exists reviews_owner_insert on reviews;
create policy reviews_owner_insert on reviews for insert with check (auth.uid() = user_id);

-- Editable by its author for 24 hours (§F6).
drop policy if exists reviews_owner_update on reviews;
create policy reviews_owner_update on reviews for update
  using (auth.uid() = user_id and created_at > now() - interval '24 hours')
  with check (auth.uid() = user_id);

drop policy if exists reviews_owner_delete on reviews;
create policy reviews_owner_delete on reviews for delete using (auth.uid() = user_id);

-- Anyone may file a correction; nobody may read the queue without the service role.
drop policy if exists reports_public_insert on reports;
create policy reports_public_insert on reports for insert with check (true);

-- pending_venues and etl_runs have no policies at all: admin-only by omission.

-- --------------------------------------------------- rating denormalisation ----
create or replace function recompute_venue_rating() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  target uuid := coalesce(new.venue_id, old.venue_id);
begin
  update venues v
     set rating_avg = sub.avg_rating,
         rating_count = sub.count_rating,
         updated_at = now()
    from (
      select round(avg(rating)::numeric, 1) as avg_rating, count(*) as count_rating
        from reviews
       where venue_id = target and state = 'published'
    ) as sub
   where v.id = target;
  return null;
end;
$$;

drop trigger if exists reviews_recompute_rating on reviews;
create trigger reviews_recompute_rating
  after insert or update or delete on reviews
  for each row execute function recompute_venue_rating();
