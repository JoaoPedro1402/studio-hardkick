-- Server-only fallback when Edge environment secrets have not been configured.
-- Values are generated on the database and never embedded in source code.
create extension if not exists supabase_vault with schema vault;
revoke all on vault.decrypted_secrets from anon, authenticated;
grant usage on schema vault to service_role;
grant select on vault.decrypted_secrets to service_role;
do $$declare k text;begin
  foreach k in array array['hardkick_rate_limit_secret','hardkick_cron_secret'] loop
    if not exists(select 1 from vault.secrets where name=k) then
      perform vault.create_secret(replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),k);
    end if;
  end loop;
end$$;
create function public.hk_runtime_config() returns jsonb
language sql security invoker set search_path='' as $$
  select coalesce(jsonb_object_agg(name,decrypted_secret),'{}'::jsonb)
  from vault.decrypted_secrets
  where name in ('hardkick_rate_limit_secret','hardkick_cron_secret','hardkick_allowed_origins')
$$;
revoke all on function public.hk_runtime_config() from public, anon, authenticated;
grant execute on function public.hk_runtime_config() to service_role;
