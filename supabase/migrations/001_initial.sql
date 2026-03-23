-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- ads table: stores Facebook ad metadata
-- ============================================================
create table if not exists ads (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  campaign_id text,
  ad_set_id text,
  creative_id text,
  fb_ad_id text unique not null,
  status text default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- contacts table: stores GHL contacts with attribution
-- ============================================================
create table if not exists contacts (
  id uuid primary key default uuid_generate_v4(),
  ghl_contact_id text unique not null,
  name text,
  email text,
  phone text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  fb_click_id text,
  fb_ad_id uuid references ads(id) on delete set null,
  pipeline_stage text,
  tags text[] default '{}',
  hired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- pipeline_events table: tracks stage changes and tag additions
-- ============================================================
create table if not exists pipeline_events (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid not null references contacts(id) on delete cascade,
  stage_name text,
  tag_added text,
  event_at timestamptz not null default now()
);

-- ============================================================
-- ad_spend table: daily spend/impressions/clicks per ad
-- ============================================================
create table if not exists ad_spend (
  id uuid primary key default uuid_generate_v4(),
  fb_ad_id text not null,
  ad_id uuid references ads(id) on delete set null,
  date date not null,
  spend numeric(10, 2) default 0,
  impressions integer default 0,
  clicks integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fb_ad_id, date)
);

-- ============================================================
-- config table: stores API keys and settings
-- ============================================================
create table if not exists config (
  id uuid primary key default uuid_generate_v4(),
  key text unique not null,
  value text not null,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Updated_at trigger function
-- ============================================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger ads_updated_at before update on ads
  for each row execute function update_updated_at();

create trigger contacts_updated_at before update on contacts
  for each row execute function update_updated_at();

create trigger ad_spend_updated_at before update on ad_spend
  for each row execute function update_updated_at();

create trigger config_updated_at before update on config
  for each row execute function update_updated_at();

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists contacts_fb_ad_id_idx on contacts(fb_ad_id);
create index if not exists contacts_hired_at_idx on contacts(hired_at);
create index if not exists contacts_ghl_contact_id_idx on contacts(ghl_contact_id);
create index if not exists pipeline_events_contact_id_idx on pipeline_events(contact_id);
create index if not exists ad_spend_fb_ad_id_idx on ad_spend(fb_ad_id);
create index if not exists ad_spend_date_idx on ad_spend(date);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table ads enable row level security;
alter table contacts enable row level security;
alter table pipeline_events enable row level security;
alter table ad_spend enable row level security;
alter table config enable row level security;

-- Service role bypasses RLS (used server-side only)
-- Anon/authenticated users cannot read any rows unless a policy is added
-- Add policies here if you need client-side access in the future
