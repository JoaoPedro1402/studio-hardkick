-- The database is the sole authority for availability. No public booking-table access.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table public.professors(id text primary key, name text not null, active boolean not null default true);
create table public.modalities(id text primary key, name text not null);
create table public.professor_modalities(professor_id text references public.professors on delete cascade, modality_id text references public.modalities on delete cascade, primary key(professor_id,modality_id));
create table public.admin_users(user_id uuid primary key references auth.users on delete cascade, created_at timestamptz not null default now());
create table public.weekly_availability(id bigint generated always as identity primary key, professor_id text not null references public.professors, weekday int not null check(weekday between 0 and 6), hour int not null check(hour between 0 and 23), enabled boolean not null default true, blocked boolean not null default false, updated_at timestamptz not null default now(), unique(professor_id,weekday,hour));
create table public.availability_exceptions(id bigint generated always as identity primary key, professor_id text not null references public.professors, date date not null, hour int not null check(hour between 0 and 23), available boolean not null, updated_at timestamptz not null default now(),unique(professor_id,date,hour));
create table public.site_settings(id boolean primary key default true check(id),price_cents int not null default 13500 check(price_cents between 100 and 1000000),pix_key text check(length(pix_key)<=200),pix_key_type text check(length(pix_key_type)<=40),pix_holder text check(length(pix_holder)<=150),updated_at timestamptz not null default now());
create table public.bookings(id uuid primary key default gen_random_uuid(),code text not null unique default ('HK-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),professor_id text not null references public.professors,modality_id text not null references public.modalities,starts_at timestamptz not null,student_name text not null check(length(student_name) between 5 and 120),phone text not null check(phone ~ '^55[1-9][0-9]9[0-9]{8}$'),guest_name text check(guest_name is null or length(guest_name) between 5 and 120),status text not null default 'pending_payment' check(status in ('pending_payment','confirmed','expired','cancelled','completed')),expires_at timestamptz not null default (now()+interval '30 minutes'),price_cents int not null check(price_cents>0),consented_at timestamptz not null default now(),privacy_version text not null default '2026-09-11',idempotency_key uuid not null unique,access_hash text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(extract(minute from starts_at)=0 and extract(second from starts_at)=0));
create unique index booking_exclusive_slot on public.bookings(professor_id,starts_at) where status in ('pending_payment','confirmed');
create index booking_status_start on public.bookings(status,starts_at);
create index booking_expiration on public.bookings(expires_at) where status='pending_payment';
create index booking_phone on public.bookings(phone);
create table public.audit_logs(id bigint generated always as identity primary key,actor uuid,action text not null,entity text not null,entity_id text,details jsonb not null default '{}',created_at timestamptz not null default now());
create table public.calendar_events(booking_id uuid primary key references public.bookings on delete cascade,event_id text not null unique,revision bigint not null default 1,synced_revision bigint not null default 0,attempts int not null default 0,next_attempt_at timestamptz not null default now(),locked_until timestamptz,lease_token uuid,last_error text,updated_at timestamptz not null default now());
create index calendar_pending on public.calendar_events(next_attempt_at);
create table private.rate_limits(key text primary key,window_start timestamptz not null default now(),attempts int not null default 1);
insert into public.professors values ('diego','Diego David',true),('mike','Mike Ribeiro',true),('tim','Tim Leite',true);
insert into public.modalities values('kickboxing','Kickboxing'),('boxe','Boxe'),('funcional','Treinamento funcional');
insert into public.professor_modalities select p.id,m.id from public.professors p cross join public.modalities m;
insert into public.site_settings(id) values(true);
insert into public.weekly_availability(professor_id,weekday,hour) values ('diego',1,7),('diego',1,9),('diego',1,18),('diego',1,19),('diego',2,9),('diego',3,7),('diego',3,9),('diego',3,18),('diego',3,19),('diego',4,9),('diego',5,9),('mike',2,8),('mike',2,10),('mike',4,8),('mike',4,10),('tim',1,7),('tim',3,7),('tim',2,11),('tim',4,11);
create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.admin_users where user_id=(select auth.uid()))$$;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;
-- Explicit RLS and grants: anonymous callers receive no table data, including PII.
do $$declare t text;begin foreach t in array array['professors','modalities','professor_modalities','admin_users','weekly_availability','availability_exceptions','site_settings','bookings','audit_logs','calendar_events'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon, authenticated',t);execute format('grant all on public.%I to service_role',t);execute format('create policy admin_read on public.%I for select to authenticated using ((select private.is_admin()))',t);execute format('grant select on public.%I to authenticated',t);end loop;end$$;
alter table private.rate_limits enable row level security;
grant all on all sequences in schema public to service_role;
grant usage on schema private to service_role;
grant all on private.rate_limits to service_role;
create function public.hk_rate_limit(p_key text) returns boolean language plpgsql security invoker set search_path='' as $$declare n int;begin insert into private.rate_limits(key) values(p_key) on conflict(key) do update set attempts=case when private.rate_limits.window_start<now()-interval '1 hour' then 1 else private.rate_limits.attempts+1 end,window_start=case when private.rate_limits.window_start<now()-interval '1 hour' then now() else private.rate_limits.window_start end returning attempts into n;return n<=8;end$$;
create function public.hk_slot_allowed(p_professor text,p_start timestamptz) returns boolean language sql stable security invoker set search_path='' as $$select exists(select 1 from public.professors where id=p_professor and active) and extract(minute from p_start)=0 and extract(second from p_start)=0 and coalesce((select available from public.availability_exceptions where professor_id=p_professor and date=(p_start at time zone 'America/Sao_Paulo')::date and hour=extract(hour from p_start at time zone 'America/Sao_Paulo')),(select enabled and not blocked from public.weekly_availability where professor_id=p_professor and weekday=extract(dow from p_start at time zone 'America/Sao_Paulo') and hour=extract(hour from p_start at time zone 'America/Sao_Paulo')),false)$$;
create function public.hk_availability(p_professor text default null) returns table(professor_id text,starts_at timestamptz) language sql stable security invoker set search_path='' as $$select p.id,s.t from public.professors p cross join generate_series(date_trunc('hour',now()+interval '24 hours'),now()+interval '7 days',interval '1 hour') s(t) where s.t>=now()+interval '24 hours' and (p_professor is null or p.id=p_professor) and public.hk_slot_allowed(p.id,s.t) and not exists(select 1 from public.bookings b where b.professor_id=p.id and b.starts_at=s.t and (b.status='confirmed' or (b.status='pending_payment' and b.expires_at>now()))) order by s.t,p.id$$;
create function private.booking_guard() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op='UPDATE' then
 if old.status<>new.status and not ((old.status='pending_payment' and new.status in ('confirmed','expired','cancelled')) or (old.status='confirmed' and new.status in ('cancelled','completed'))) then raise exception 'invalid_transition';end if;
 if old.status='pending_payment' and new.status='confirmed' and old.expires_at<=now() then raise exception 'reservation_expired';end if;
 if new.status='completed' and old.status<>new.status and old.starts_at+interval '1 hour'>now() then raise exception 'class_not_finished';end if;
 new.updated_at=now();end if;return new;end$$;
create trigger booking_guard before update on public.bookings for each row execute function private.booking_guard();
create function private.queue_calendar() returns trigger language plpgsql set search_path='' as $$begin
 insert into public.calendar_events(booking_id,event_id) values(new.id,'hk'||replace(new.id::text,'-','')) on conflict(booking_id) do update set revision=public.calendar_events.revision+1,next_attempt_at=now(),updated_at=now();
 insert into public.audit_logs(actor,action,entity,entity_id,details) values(nullif(current_setting('hardkick.actor',true),'')::uuid,case when tg_op='INSERT' then 'created' else new.status end,'booking',new.id::text,jsonb_build_object('status',new.status));return new;end$$;
create trigger booking_calendar after insert or update of status on public.bookings for each row execute function private.queue_calendar();
create function public.hk_reserve(p_professor text,p_modality text,p_start timestamptz,p_name text,p_phone text,p_guest text,p_idempotency uuid,p_access_hash text) returns public.bookings language plpgsql security invoker set search_path='' as $$declare b public.bookings;begin
 -- Shared professor lock also serializes schedule edits against reservations.
 perform pg_advisory_xact_lock(hashtextextended('professor:'||p_professor,0));
 select * into b from public.bookings where idempotency_key=p_idempotency;
 if found then if b.access_hash<>p_access_hash or b.professor_id<>p_professor or b.modality_id<>p_modality or b.starts_at<>p_start or b.phone<>p_phone or b.student_name<>p_name or b.guest_name is distinct from p_guest then raise exception 'idempotency_conflict';end if;return b;end if;
 if p_start<now()+interval '24 hours' or p_start>now()+interval '7 days' then raise exception 'invalid_time';end if;
 if not public.hk_slot_allowed(p_professor,p_start) or not exists(select 1 from public.professor_modalities where professor_id=p_professor and modality_id=p_modality) then raise exception 'invalid_slot';end if;
 update public.bookings set status='expired' where professor_id=p_professor and starts_at=p_start and status='pending_payment' and expires_at<=now();
 insert into public.bookings(professor_id,modality_id,starts_at,student_name,phone,guest_name,price_cents,idempotency_key,access_hash) values(p_professor,p_modality,p_start,p_name,p_phone,p_guest,(select price_cents from public.site_settings where id),p_idempotency,p_access_hash) returning * into b;return b;end$$;
create function public.hk_transition(p_id uuid,p_status text,p_actor uuid) returns public.bookings language plpgsql security invoker set search_path='' as $$declare b public.bookings;begin
 if not exists(select 1 from public.admin_users where user_id=p_actor) then raise exception 'unauthorized';end if;
 perform set_config('hardkick.actor',p_actor::text,true);
 select * into b from public.bookings where id=p_id for update;
 if not found then raise exception 'not_found';end if;
 update public.bookings set status=p_status where id=p_id returning * into b;return b;end$$;
create function public.hk_admin_change(p_actor uuid,p_kind text,p_data jsonb) returns void language plpgsql security invoker set search_path='' as $$declare pid text:=p_data->>'professor_id';d date;h int;begin
 if not exists(select 1 from public.admin_users where user_id=p_actor) then raise exception 'unauthorized';end if;
 if p_kind='settings' then
 update public.site_settings set price_cents=(p_data->>'price_cents')::int,pix_key=nullif(trim(p_data->>'pix_key'),''),pix_key_type=nullif(trim(p_data->>'pix_key_type'),''),pix_holder=nullif(trim(p_data->>'pix_holder'),''),updated_at=now() where id;
 elsif p_kind in ('weekly','exception') then
 perform pg_advisory_xact_lock(hashtextextended('professor:'||pid,0));h=(p_data->>'hour')::int;
 if p_kind='weekly' then
 insert into public.weekly_availability(professor_id,weekday,hour,enabled,blocked) values(pid,(p_data->>'weekday')::int,h,(p_data->>'enabled')::boolean,(p_data->>'blocked')::boolean) on conflict(professor_id,weekday,hour) do update set enabled=excluded.enabled,blocked=excluded.blocked,updated_at=now();
 else
 d=(p_data->>'date')::date;if d<(now() at time zone 'America/Sao_Paulo')::date then raise exception 'invalid_date';end if;
 insert into public.availability_exceptions(professor_id,date,hour,available) values(pid,d,h,(p_data->>'available')::boolean) on conflict(professor_id,date,hour) do update set available=excluded.available,updated_at=now();end if;
 else raise exception 'invalid_action';end if;
 insert into public.audit_logs(actor,action,entity,entity_id,details) values(p_actor,'updated',p_kind,pid,case when p_kind='settings' then jsonb_build_object('price_cents',p_data->'price_cents','pix_changed',true) else p_data end);end$$;
create function public.hk_cleanup() returns void language plpgsql security invoker set search_path='' as $$begin
 update public.bookings set status='expired' where status='pending_payment' and expires_at<=now();
 update public.bookings set status='completed' where status='confirmed' and starts_at+interval '1 hour'<=now();
 delete from private.rate_limits where window_start<now()-interval '2 days';end$$;
create function public.hk_calendar_claim() returns setof public.calendar_events language sql security invoker set search_path='' as $$update public.calendar_events c set locked_until=now()+interval '10 minutes',lease_token=gen_random_uuid() where booking_id in(select booking_id from public.calendar_events where revision>synced_revision and next_attempt_at<=now() and (locked_until is null or locked_until<now()) order by next_attempt_at limit 3 for update skip locked) returning c.*$$;
-- Privileged operations can only be invoked by the Edge Function's server key.
do $$declare f record;begin for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'hk_%' loop execute 'revoke all on function '||f.signature||' from public,anon,authenticated';execute 'grant execute on function '||f.signature||' to service_role';end loop;end$$;
revoke all on all functions in schema private from public,anon;


-- Realtime is admin-only through the same SELECT RLS policies.
do $$begin if exists(select 1 from pg_publication where pubname='supabase_realtime') then alter publication supabase_realtime add table public.bookings;end if;end$$;
