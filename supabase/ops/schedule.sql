-- Execute only after deployment. Store URL and secret using Supabase Vault UI first.
-- Vault names: hardkick_maintenance_url, hardkick_cron_secret.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('hardkick-expire-and-calendar','* * * * *',
$$select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name='hardkick_maintenance_url'),
  headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='hardkick_cron_secret')),
  body := '{"action":"maintenance"}'::jsonb,
  timeout_milliseconds := 10000
);$$);
