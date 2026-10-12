-- Adds a route without changing existing source bindings, evidence or reward gates.
begin;
alter table public.early_sessions drop constraint early_sessions_route_check;
alter table public.early_sessions add constraint early_sessions_route_check
  check (route in ('spotify_saved_track', 'youtube_subscription', 'youtube_like'));
commit;
