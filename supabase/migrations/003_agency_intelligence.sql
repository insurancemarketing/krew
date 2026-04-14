-- ============================================================
-- Migration 003: Agency Intelligence Platform
-- Adds client_type, contracts, monthly performance, and
-- all supporting tables for Mason's agency operations.
-- ============================================================

-- Add client_type to krew_clients (insurance_sales | insurance_recruiting)
alter table krew_clients
  add column if not exists client_type text default 'insurance_recruiting';

-- ============================================================
-- client_contracts: billing & contract info per client
-- ============================================================
create table if not exists client_contracts (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references krew_clients(id) on delete cascade unique,
  client_type text default 'insurance_recruiting',
  monthly_retainer numeric default 0,
  performance_fee_type text default 'per_hire', -- 'per_lead' | 'per_policy' | 'per_hire' | 'percent_adspend'
  performance_fee_amount numeric default 0,
  contract_start date,
  contract_renewal date,
  ad_budget_monthly numeric default 0,
  hours_per_month_estimate numeric default 0,
  target_hourly_rate numeric default 150,
  cac numeric default 0,
  churn_risk_score int default 0,
  churn_risk_color text default 'green', -- 'green' | 'yellow' | 'red'
  status text default 'active', -- 'active' | 'paused' | 'churned'
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table client_contracts enable row level security;

-- ============================================================
-- monthly_performance: manual + auto-calculated monthly numbers
-- ============================================================
create table if not exists monthly_performance (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references krew_clients(id) on delete cascade,
  month date not null, -- first day of month
  -- spend & leads (auto from GHL/FB or manual)
  ad_spend numeric default 0,
  leads int default 0,
  -- sales funnel (manual)
  appointments_set int default 0,
  appointments_showed int default 0,
  policies_sold int default 0,
  premium_written numeric default 0,
  avg_policy_value numeric default 0,
  policies_cancelled int default 0,
  active_policies int default 0,
  -- recruiting (auto/manual)
  hires int default 0,
  active_agents int default 0,
  agents_churned int default 0,
  -- calculated (server-side on save)
  cost_per_lead numeric,
  cost_per_appointment numeric,
  cost_per_policy numeric,
  show_rate numeric,
  close_rate numeric,
  persistency_rate numeric,
  roas numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (client_id, month)
);

alter table monthly_performance enable row level security;

-- ============================================================
-- agent_tracking: hired agent production tracking
-- ============================================================
create table if not exists agent_tracking (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references krew_clients(id) on delete cascade,
  contact_id uuid references krew_contacts(id) on delete set null,
  first_name text,
  last_name text,
  email text,
  utm_content text,
  hire_date date,
  status text default 'active', -- 'active' | 'inactive' | 'churned'
  churned_date date,
  policies_sold_30d int default 0,
  policies_sold_60d int default 0,
  policies_sold_90d int default 0,
  premium_30d numeric default 0,
  premium_60d numeric default 0,
  premium_90d numeric default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table agent_tracking enable row level security;

-- ============================================================
-- hours_log: Mason's time tracking per client
-- ============================================================
create table if not exists hours_log (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references krew_clients(id) on delete cascade,
  log_date date not null default current_date,
  hours numeric not null,
  task_description text,
  created_at timestamptz default now()
);

alter table hours_log enable row level security;

-- ============================================================
-- split_tests: ad split test tracker
-- ============================================================
create table if not exists split_tests (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references krew_clients(id) on delete cascade,
  test_name text not null,
  element_tested text,
  control_rate numeric,
  variation_rate numeric,
  start_date date,
  end_date date,
  winner text, -- 'control' | 'variation' | 'inconclusive'
  implemented boolean default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table split_tests enable row level security;

-- ============================================================
-- creative_library: ad creative catalog
-- ============================================================
create table if not exists creative_library (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references krew_clients(id) on delete cascade,
  ad_name text not null,
  utm_content text,
  creative_type text default 'video', -- 'video' | 'image' | 'carousel'
  concept_name text,
  hook_summary text,
  thumbnail_url text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table creative_library enable row level security;

-- ============================================================
-- client_touchpoints: communication log
-- ============================================================
create table if not exists client_touchpoints (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references krew_clients(id) on delete cascade,
  touchpoint_date date not null default current_date,
  type text not null, -- 'call' | 'email' | 'slack' | 'meeting' | 'report_sent'
  notes text,
  action_items text,
  created_at timestamptz default now()
);

alter table client_touchpoints enable row level security;

-- ============================================================
-- lead_quality_by_ad: downstream conversion quality per utm
-- ============================================================
create table if not exists lead_quality_by_ad (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references krew_clients(id) on delete cascade,
  utm_content text not null,
  month date not null, -- first day of month
  leads int default 0,
  booked int default 0,
  showed int default 0,
  closed int default 0,
  policies_sold int default 0,
  -- calculated
  book_rate numeric,
  show_rate numeric,
  close_rate numeric,
  policy_rate numeric,
  quality_score numeric, -- composite 0-100
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (client_id, utm_content, month)
);

alter table lead_quality_by_ad enable row level security;

-- ============================================================
-- smart_alerts: generated alerts per client
-- ============================================================
create table if not exists smart_alerts (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references krew_clients(id) on delete cascade,
  alert_type text not null, -- 'error' | 'warning' | 'info' | 'success'
  message text not null,
  category text, -- 'performance' | 'budget' | 'renewal' | 'touchpoint' | 'churn'
  is_resolved boolean default false,
  generated_at timestamptz default now(),
  resolved_at timestamptz
);

alter table smart_alerts enable row level security;

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists monthly_performance_client_month on monthly_performance(client_id, month desc);
create index if not exists agent_tracking_client_id on agent_tracking(client_id);
create index if not exists agent_tracking_contact_id on agent_tracking(contact_id);
create index if not exists hours_log_client_date on hours_log(client_id, log_date desc);
create index if not exists split_tests_client_id on split_tests(client_id);
create index if not exists creative_library_client_id on creative_library(client_id);
create index if not exists creative_library_utm on creative_library(utm_content);
create index if not exists client_touchpoints_client_date on client_touchpoints(client_id, touchpoint_date desc);
create index if not exists lead_quality_client_month on lead_quality_by_ad(client_id, month desc);
create index if not exists smart_alerts_client on smart_alerts(client_id, generated_at desc);

-- ============================================================
-- updated_at triggers for new tables
-- ============================================================
create trigger client_contracts_updated_at before update on client_contracts
  for each row execute function update_updated_at();

create trigger monthly_performance_updated_at before update on monthly_performance
  for each row execute function update_updated_at();

create trigger agent_tracking_updated_at before update on agent_tracking
  for each row execute function update_updated_at();

create trigger split_tests_updated_at before update on split_tests
  for each row execute function update_updated_at();

create trigger creative_library_updated_at before update on creative_library
  for each row execute function update_updated_at();

create trigger lead_quality_updated_at before update on lead_quality_by_ad
  for each row execute function update_updated_at();
