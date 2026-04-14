# Krew — Agency Intelligence Platform

## What Krew Is

Krew is a full-stack agency intelligence platform built for Mason, a performance marketer who runs paid Facebook/Meta ads for insurance agencies and recruiting operations. It tracks ad attribution, client business metrics, and Mason's personal agency profitability across all clients in one place.

## Tech Stack

- **Framework:** Next.js (app router)
- **Database:** Supabase (Postgres)
- **Styling:** Tailwind CSS
- **Deployment:** Vercel
- **APIs:** GHL REST API (read-only), Facebook Marketing API (optional, manual spend input as fallback)

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
CRON_SECRET=
```

---

## Mason's Clients

| Client | Business Type | GHL Location | Hired Tag | Payout |
|---|---|---|---|---|
| Nick Scordos — AO Infinite | Insurance recruiting | configured | 🟢 recruitment - hire made | $55/hire |
| Cole Caughern | P&C insurance sales | TBD | TBD | TBD |
| Chelsi Kania — PSPA | Life insurance recruiting (veterans) | configured | TBD | TBD |
| Allan | Mortgage protection sales | TBD | TBD | TBD |
| Julie Pike | Final expense sales | TBD | TBD | TBD |
| Colleen | Mortgage life insurance (Canada) | TBD | TBD | TBD |

**Client types:**
- `insurance_recruiting` — ads drive leads into a hiring funnel (watch VSL → apply → schedule → hire)
- `insurance_sales` — ads drive leads to book appointments with agents to sell policies

---

## Database Schema

### Existing Tables (already built — do not modify)

```sql
clients:
  id, name, ghl_api_key, ghl_location_id, hired_tag,
  payout_per_hire, fb_spend_manual, created_at

contacts:
  id, client_id, ghl_contact_id, first_name, last_name,
  email, phone, utm_content, utm_campaign, utm_source,
  utm_medium, fbclid, tags, is_hired, hired_at,
  watch_pct, created_at, last_synced

ad_spend:
  id, client_id, utm_content, ad_name, spend,
  week_starting, created_at
```

### New Tables (add if not exists)

```sql
client_contracts:
  id, client_id, client_type, monthly_retainer,
  performance_fee_type, performance_fee_amount,
  contract_start, contract_renewal, ad_budget_monthly,
  hours_per_month_estimate, target_hourly_rate,
  cac, status, notes, created_at

monthly_performance:
  id, client_id, month,
  ad_spend, leads, appointments_set, appointments_showed,
  policies_sold, premium_written, avg_policy_value,
  policies_cancelled, active_policies,
  hires, active_agents, agents_churned,
  cost_per_lead, cost_per_appointment, cost_per_policy,
  show_rate, close_rate, persistency_rate, roas,
  created_at, updated_at

agent_tracking:
  id, client_id, contact_id, hire_date, status,
  churned_date, policies_sold_30d, policies_sold_60d,
  policies_sold_90d, premium_30d, premium_60d,
  premium_90d, notes, created_at

hours_log:
  id, client_id, log_date, hours,
  task_description, created_at

split_tests:
  id, client_id, test_name, element_tested,
  control_rate, variation_rate, start_date, end_date,
  winner, implemented, notes, created_at

creative_library:
  id, client_id, ad_name, utm_content, creative_type,
  concept_name, hook_summary, thumbnail_url,
  notes, created_at

client_touchpoints:
  id, client_id, touchpoint_date, type,
  notes, action_items, created_at

lead_quality_by_ad:
  id, client_id, utm_content, month,
  leads, booked, showed, closed, policies_sold,
  book_rate, show_rate, close_rate, policy_rate,
  quality_score, created_at
```

---

## Calculated Formulas

Always compute server-side. Never hardcode.

```
cost_per_lead = ad_spend / leads
cost_per_appointment = ad_spend / appointments_showed
cost_per_policy = ad_spend / policies_sold
show_rate = appointments_showed / appointments_set
close_rate = policies_sold / appointments_showed
persistency_rate = (active_policies - policies_cancelled) / active_policies
roas = premium_written / ad_spend
revenue_per_hour = total_monthly_revenue / total_hours_logged_this_month

ltv = avg_monthly_revenue * avg_months_active
gross_margin = (monthly_revenue - monthly_service_cost) / monthly_revenue
ltgp = ltv * gross_margin
ltgp_cac_ratio = ltgp / cac
payback_period_months = cac / monthly_gross_profit

quality_score = (book_rate * 0.25 + show_rate * 0.25 + close_rate * 0.25 + policy_rate * 0.25) * 100

churn_risk_score:
  no hires/policies in 14 days → +20
  performance down 30%+ vs last month → +20
  contract renewal within 30 days → +15
  no touchpoint in 7 days → +15
  cpl or cpp trending up 3 months → +10
  0-30 = green | 31-60 = yellow | 61+ = red
```

---

## GHL Integration

### How it works
- GHL stores UTM parameters on contact records when a lead opts in from a Facebook ad
- Krew syncs contacts from GHL API every 6 hours and on-demand
- Hired detection: strip emojis from tags, lowercase, check if contains client's `hired_tag` string
- utm_content is the ad identifier — join key between GHL contacts and ad spend

### Key GHL API endpoint
```
GET https://services.leadconnectorhq.com/contacts/
Headers:
  Authorization: Bearer {ghl_api_key}
  Version: 2021-07-28
Params:
  locationId: {ghl_location_id}
  limit: 100
  startAfter: {cursor}
```

### UTM content values for Nick (AO Infinite)
Some ads use slugs, some use Facebook Ad IDs. These are the same ad:
- `lambo-facetime` = Lambo Facetime ad
- `11-8-25-eric-facetime` + `11-13-25-eric-facetime` = same Eric Facetime ad (UTM changed mid-run)
- `kendall-facetime` = Kendall Facetime ad (paused)
- `120234824355290241` = AI Ad 2 (killed)
- `120234743173790241` = AI Ad 2 variant (killed)

### Funnel stages detected from GHL tags (Nick)
- Opted in: `fb ad`
- Watched 5%: `watched5%`
- Watched 25%: `watch25%`
- Watched 50%: `watched50%`
- Watched 75%: `watched75%`
- Watched 100%: `watch100%`
- Applied: `⚪ recruitment - new applicant`
- Scheduled: `scheduled appointment`
- Hired: `4.0 🟢 recruitment - hire made`

---

## Attribution Logic

### Ad resolution (merge duplicates)
```
lambo-facetime OR 120236173050580241 OR 12/27/25 | Test | Lambo Facetime
  → display as: "Lambo Facetime"

11-8-25-eric-facetime OR 11-13-25-eric-facetime OR 12/27/25 | Test | Eric Facetime
  → display as: "Eric Facetime"

kendall-facetime OR 12/27/25 | Test | Kendall Facetime
  → display as: "Kendall Facetime"

120234824355290241
  → display as: "AI Ad 2"

120234743173790241
  → display as: "AI Ad 2 (variant)"

empty utm_content
  → display as: "(No UTM)"
```

### Known performance (Nick — all time as of Apr 2026)
| Ad | Leads | Hired | Win% | Spend | Cost/Hire |
|---|---|---|---|---|---|
| Lambo Facetime | 626 | 37 | 5.9% | $3,725 | $101 |
| Eric Facetime | 262 | 23 | 8.8% | $2,702 | $117 |
| Kendall Facetime | 169 | 10 | 5.9% | $1,435 | $143 |
| AI Ad 2 | 300 | 14 | 4.7% | $2,896 | $207 — KILLED |
| AI Ad 2 variant | 81 | 4 | 4.9% | $894 | $224 — KILLED |

Total: 110 hires, $12,532 spent, $114 blended cost/hire
Mason earnings: $6,050 total ($55 × 110 hires)

---

## Current Ad Setup (Nick — active)

- **Active ads:** Lambo Facetime ($60/day), Eric Facetime ($40/day)
- **Killed ads:** AI Ad 2, AI Ad 2 variant, Kendall Facetime
- **Total daily budget:** $100/day = $3,000/month
- **Retargeting:** Being set up — 3 ad sets at $10/day total
  - Hot video viewers (75%+ watched, didn't opt in)
  - Opted in, never watched
  - Watched, didn't apply

---

## Funnel Performance (Nick — last 30 days)

| Step | Visitors | Completions | Rate |
|---|---|---|---|
| Begin (opt-in) | 3,198 | 544 | 17% → currently ~11% (split test running) |
| Watch VSL | 457 | 108 | 23.6% |
| Questionnaire | 17 | 7 | 41.2% |
| Schedule | 163 | 107 | 65.6% |

**Key insight:** 84% drop-off between watched and applied is the biggest leak.

### Split test (running since Apr 2, 2026)
- Control: 10.54% opt-in (598 views, 63 opt-ins)
- Variation: 11.59% opt-in (656 views, 76 opt-ins)
- Changes made: removed last name + email fields, implied TCPA consent, updated scarcity copy, changed CTA to "See If You Qualify"

### Page speed issue
- Performance score: 43/100 (mobile)
- LCP: 8.7s — primary cause is reCAPTCHA loading 727KB
- Fix needed: remove/defer reCAPTCHA, reduce from 13 font files to 2

---

## Pages Already Built

- `/dashboard` — master dashboard (all clients)
- `/dashboard/[clientId]` — client attribution dashboard
- `/dashboard/[clientId]/settings` — GHL API key, hired tag, spend mapping
- `/dashboard/[clientId]/contacts` — filterable contact list
- `/dashboard/import` — CSV upload for GHL contacts + FB spend
- `/earnings` — Mason's earnings tracker
- `/api/cron/sync-all-clients` — GHL sync cron

---

## Pages To Build (backlog)

### Priority 1 — Agency dashboard
`/agency` — master view of all clients with business metrics, churn risk, LTGP:CAC, Mason's earnings summary

### Priority 2 — Monthly input
`/dashboard/[clientId]/input` — manual entry of post-funnel metrics (appointments, policies, premium)

### Priority 3 — Client dashboard tabs
Add tabs to existing client page:
- Pipeline Performance
- Revenue & Premium
- Lead Quality by Ad
- Financials (LTGP:CAC calculator, budget pacing, Mason's earnings)
- Agents (recruiting clients only)
- Creatives
- Hours Log
- Touchpoints
- Split Tests

### Priority 4 — Supporting pages
- `/dashboard/[clientId]/agents` — agent retention tracker (recruiting clients)
- `/dashboard/[clientId]/creatives` — creative library
- `/dashboard/[clientId]/hours` — hours log
- `/dashboard/[clientId]/touchpoints` — client communication log
- `/dashboard/[clientId]/tests` — split test tracker
- `/creatives` — cross-client creative library

---

## Smart Alerts (nightly cron)

Trigger alerts when:
- No hires/policies reported in 14 days → 🔴
- Performance down 30%+ vs last month → 🔴
- Contract renewal within 30 days → 🔴
- No touchpoint in 7 days → 🟡
- Budget pacing 20%+ over → 🟡
- CPL or CPP trending up 3 months → 🟡
- Agent hired 45+ days with zero production → 🟡
- Ad with win rate >20% → 🟢 (scale opportunity)

---

## Coding Standards

- All calculations server-side in API routes — never client-side
- Never expose SUPABASE_SERVICE_KEY to client
- Row Level Security enabled on all tables
- All currency formatted as $X,XXX
- All percentages to 1 decimal place
- Loading skeletons on all data tables
- Empty states on all pages with clear CTA
- All pages mobile responsive
- Hired tag detection: strip emojis, lowercase, use `.includes()` not exact match
- utm_content is the universal ad identifier — never use ad name as primary key
- GHL API rate limit: 100 requests per 10 seconds — add delays between paginated requests

---

## Key Business Context

- Mason gets paid $55 per hire for Nick's recruiting campaign
- Nick's total ad spend: $12,532 all time
- Mason's total earnings from Nick: $6,050
- Nick's monthly ad budget: $3,000 ($100/day)
- Average hires per month: 20-30
- Mason's target: push to 35-40 hires/month through funnel optimization
- Nick has 17,000 person email list being re-engaged
- Nick runs group interviews — max 20 people, calendar books 7 days out max

---

## Architecture Notes

- Multi-client: every query must filter by client_id
- GHL sync is the source of truth for contacts, UTMs, tags, funnel stages
- monthly_performance table is source of truth for manually entered post-funnel data
- ad_spend table is source of truth for Facebook spend data
- Do not modify existing GHL sync logic
- Do not modify existing attribution table/charts
- Everything new is additive only
