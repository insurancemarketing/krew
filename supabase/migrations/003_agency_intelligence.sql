-- ============================================================
-- Migration 003: Agency Intelligence Platform
-- Adds full client intelligence, billing, performance tracking
-- ============================================================

-- Add client_type to krew_clients
ALTER TABLE krew_clients
  ADD COLUMN IF NOT EXISTS client_type text DEFAULT 'insurance_recruiting';

-- ============================================================
-- client_contracts — billing & contract info per client
-- ============================================================
CREATE TABLE IF NOT EXISTS client_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES krew_clients(id) ON DELETE CASCADE,
  client_type text NOT NULL DEFAULT 'insurance_recruiting', -- 'insurance_sales' | 'insurance_recruiting'
  monthly_retainer numeric DEFAULT 0,
  performance_fee_type text DEFAULT 'per_hire', -- 'per_lead' | 'per_policy' | 'per_hire' | 'percent_adspend'
  performance_fee_amount numeric DEFAULT 0,
  contract_start date,
  contract_renewal date,
  ad_budget_monthly numeric DEFAULT 0,
  hours_per_month_estimate numeric DEFAULT 0,
  target_hourly_rate numeric DEFAULT 150,
  cac numeric DEFAULT 0,
  status text DEFAULT 'active', -- 'active' | 'paused' | 'churned'
  churn_risk_score int DEFAULT 0,
  churn_risk_color text DEFAULT 'green', -- 'green' | 'yellow' | 'red'
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- monthly_performance — manual + auto-calculated monthly KPIs
-- ============================================================
CREATE TABLE IF NOT EXISTS monthly_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES krew_clients(id) ON DELETE CASCADE,
  month date NOT NULL, -- first day of month (e.g. 2024-01-01)
  ad_spend numeric DEFAULT 0,
  leads int DEFAULT 0,
  appointments_set int DEFAULT 0,
  appointments_showed int DEFAULT 0,
  policies_sold int DEFAULT 0,
  premium_written numeric DEFAULT 0,
  avg_policy_value numeric DEFAULT 0,
  policies_cancelled int DEFAULT 0,
  active_policies int DEFAULT 0,
  -- recruiting specific
  hires int DEFAULT 0,
  active_agents int DEFAULT 0,
  agents_churned int DEFAULT 0,
  -- calculated (computed on save in API)
  cost_per_lead numeric,
  cost_per_appointment numeric,
  cost_per_policy numeric,
  show_rate numeric,
  close_rate numeric,
  persistency_rate numeric,
  roas numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, month)
);

-- ============================================================
-- agent_tracking — per-agent production tracking (recruiting)
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES krew_clients(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES krew_contacts(id) ON DELETE SET NULL,
  hire_date date,
  status text DEFAULT 'active', -- 'active' | 'inactive' | 'churned'
  churned_date date,
  policies_sold_30d int DEFAULT 0,
  policies_sold_60d int DEFAULT 0,
  policies_sold_90d int DEFAULT 0,
  premium_30d numeric DEFAULT 0,
  premium_60d numeric DEFAULT 0,
  premium_90d numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- hours_log — time tracking per client
-- ============================================================
CREATE TABLE IF NOT EXISTS hours_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES krew_clients(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  hours numeric NOT NULL,
  task_description text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- split_tests — A/B test tracker
-- ============================================================
CREATE TABLE IF NOT EXISTS split_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES krew_clients(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  element_tested text,
  control_rate numeric,
  variation_rate numeric,
  start_date date,
  end_date date,
  winner text, -- 'control' | 'variation' | 'inconclusive'
  implemented boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- creative_library — ad creative metadata + UTM linking
-- ============================================================
CREATE TABLE IF NOT EXISTS creative_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES krew_clients(id) ON DELETE CASCADE,
  ad_name text NOT NULL,
  utm_content text,
  creative_type text DEFAULT 'video', -- 'video' | 'image' | 'carousel'
  concept_name text,
  hook_summary text,
  thumbnail_url text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- client_touchpoints — communication log
-- ============================================================
CREATE TABLE IF NOT EXISTS client_touchpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES krew_clients(id) ON DELETE CASCADE,
  touchpoint_date date NOT NULL,
  type text NOT NULL, -- 'call' | 'email' | 'slack' | 'meeting' | 'report_sent'
  notes text,
  action_items text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- lead_quality_by_ad — conversion quality per ad/utm per month
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_quality_by_ad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES krew_clients(id) ON DELETE CASCADE,
  utm_content text NOT NULL,
  month date NOT NULL,
  leads int DEFAULT 0,
  booked int DEFAULT 0,
  showed int DEFAULT 0,
  closed int DEFAULT 0,
  policies_sold int DEFAULT 0,
  -- calculated
  book_rate numeric,
  show_rate numeric,
  close_rate numeric,
  policy_rate numeric,
  quality_score numeric, -- composite 0-100
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, utm_content, month)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS client_contracts_client_id_idx ON client_contracts(client_id);
CREATE INDEX IF NOT EXISTS monthly_performance_client_id_idx ON monthly_performance(client_id);
CREATE INDEX IF NOT EXISTS monthly_performance_month_idx ON monthly_performance(month);
CREATE INDEX IF NOT EXISTS agent_tracking_client_id_idx ON agent_tracking(client_id);
CREATE INDEX IF NOT EXISTS agent_tracking_contact_id_idx ON agent_tracking(contact_id);
CREATE INDEX IF NOT EXISTS hours_log_client_id_idx ON hours_log(client_id);
CREATE INDEX IF NOT EXISTS hours_log_log_date_idx ON hours_log(log_date);
CREATE INDEX IF NOT EXISTS split_tests_client_id_idx ON split_tests(client_id);
CREATE INDEX IF NOT EXISTS creative_library_client_id_idx ON creative_library(client_id);
CREATE INDEX IF NOT EXISTS creative_library_utm_content_idx ON creative_library(utm_content);
CREATE INDEX IF NOT EXISTS client_touchpoints_client_id_idx ON client_touchpoints(client_id);
CREATE INDEX IF NOT EXISTS client_touchpoints_touchpoint_date_idx ON client_touchpoints(touchpoint_date);
CREATE INDEX IF NOT EXISTS lead_quality_by_ad_client_id_idx ON lead_quality_by_ad(client_id);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE client_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE hours_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_quality_by_ad ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (used by all server-side API routes)
-- No anon access needed for these tables (internal use only)
