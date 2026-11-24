-- Push endpoints come from browsers via users, and the server POSTs to them. Only allow the browsers' push services,
-- so a crafted endpoint can't make the server call other hosts (SSRF). Mirrors isPushEndpoint() in src/lib/push.ts.
delete from public.stride_push_subscriptions
where endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|([a-z0-9-]+\.)+push\.apple\.com|([a-z0-9-]+\.)+notify\.windows\.com)/';

alter table public.stride_push_subscriptions drop constraint if exists stride_push_subscriptions_endpoint_host;
alter table public.stride_push_subscriptions add constraint stride_push_subscriptions_endpoint_host
  check (endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|([a-z0-9-]+\.)+push\.apple\.com|([a-z0-9-]+\.)+notify\.windows\.com)/');
