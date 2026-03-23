-- Allow the anon role to read and write ads, ad_spend, and contacts
-- so that the import page can process CSVs entirely in the browser.

-- ads: anon can insert, update, and select
create policy "anon_ads_insert" on ads
  for insert to anon with check (true);

create policy "anon_ads_update" on ads
  for update to anon using (true) with check (true);

create policy "anon_ads_select" on ads
  for select to anon using (true);

-- ad_spend: anon can insert and update
create policy "anon_ad_spend_insert" on ad_spend
  for insert to anon with check (true);

create policy "anon_ad_spend_update" on ad_spend
  for update to anon using (true) with check (true);

-- contacts: anon can insert and update
create policy "anon_contacts_insert" on contacts
  for insert to anon with check (true);

create policy "anon_contacts_update" on contacts
  for update to anon using (true) with check (true);
