-- pg_net is not relocatable. Recreate only with an empty transient HTTP queue.
-- Booking, Calendar outbox and audit data are unaffected.
do $$begin
  if exists(select 1 from net.http_request_queue) then
    raise exception 'Wait for pending HTTP requests before moving pg_net';
  end if;
end$$;
drop extension pg_net;
create extension pg_net with schema extensions;
