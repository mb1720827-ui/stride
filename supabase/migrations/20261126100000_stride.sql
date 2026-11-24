-- Stride: tasks, habits and skills. Shares the Supabase project (and accounts) with Takeaway; every table is prefixed stride_.
-- Safe to run more than once.

create table if not exists public.stride_settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  time_zone text not null default 'Africa/Lagos',
  wake text not null default '06:00' check (wake ~ '^\d{2}:\d{2}$'),
  sleep text not null default '22:30' check (sleep ~ '^\d{2}:\d{2}$'),
  quiet_start text not null default '22:30' check (quiet_start ~ '^\d{2}:\d{2}$'),
  quiet_end text not null default '06:30' check (quiet_end ~ '^\d{2}:\d{2}$'),
  daily_cap int not null default 8 check (daily_cap between 2 and 20),
  -- Free time per weekday ("0" = Sunday … "6" = Saturday), local time.
  free_blocks jsonb not null default '{
    "0": [{"start": "10:00", "end": "13:00"}, {"start": "16:00", "end": "20:00"}],
    "1": [{"start": "18:00", "end": "22:00"}],
    "2": [{"start": "18:00", "end": "22:00"}],
    "3": [{"start": "18:00", "end": "22:00"}],
    "4": [{"start": "18:00", "end": "22:00"}],
    "5": [{"start": "18:00", "end": "22:00"}],
    "6": [{"start": "10:00", "end": "13:00"}, {"start": "16:00", "end": "20:00"}]
  }'::jsonb,
  brief_sent_on date,
  checkin_sent_on date,
  sent_on date,
  sent_count int not null default 0,
  calendar_token_hash text unique,
  maintained_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.stride_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('task', 'habit', 'skill')),
  title text not null check (char_length(title) between 1 and 200),
  status text not null default 'active' check (status in ('active', 'paused', 'done', 'archived')),
  deadline timestamptz,
  plan jsonb not null,
  level int not null default 0,
  milestone int not null default 0,
  at_risk boolean not null default false,
  remind boolean not null default true,
  level_offer boolean not null default false,
  level_note text,
  level_checked_at timestamptz not null default now(),
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists stride_plans_user_status on public.stride_plans (user_id, status);

create table if not exists public.stride_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  text text not null check (char_length(text) between 1 and 1000),
  status text not null default 'queued' check (status in ('queued', 'processing', 'ready', 'accepted', 'discarded', 'failed')),
  kind text check (kind in ('task', 'habit', 'skill', 'command', 'quiz', 'review')),
  plan_id uuid references public.stride_plans on delete cascade,
  draft jsonb,
  feedback text check (char_length(feedback) <= 1000),
  error text,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists stride_requests_user_status on public.stride_requests (user_id, status);

create table if not exists public.stride_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  plan_id uuid references public.stride_plans on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  starts_at timestamptz not null,
  minutes int not null check (minutes between 1 and 600),
  status text not null default 'planned' check (status in ('planned', 'done', 'skipped', 'missed')),
  step int,
  url text,
  notified_at timestamptz,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  unique (plan_id, starts_at)
);
create index if not exists stride_items_user_starts on public.stride_items (user_id, starts_at);

create table if not exists public.stride_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  plan_id uuid not null references public.stride_plans on delete cascade,
  stage int not null default 0,
  title text not null,
  url text not null,
  type text not null check (type in ('book', 'course', 'video', 'article', 'exercise', 'project')),
  free boolean not null default true,
  reason text,
  takeaway_item_id uuid,
  checked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.stride_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  plan_id uuid not null references public.stride_plans on delete cascade,
  milestone int not null,
  questions jsonb not null,
  answers jsonb not null,
  score int not null,
  created_at timestamptz not null default now()
);

create table if not exists public.stride_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.stride_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  week_start date not null,
  stats jsonb not null default '{}'::jsonb,
  summary text,
  suggestions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- The hash of the secret that /api/tick sends. Row-level security with no policies: only the functions below can read it.
create table if not exists public.stride_tick_secret (
  id int primary key default 1 check (id = 1),
  hash text not null
);
alter table public.stride_tick_secret enable row level security;

do $$
declare t text;
begin
  foreach t in array array['stride_settings', 'stride_plans', 'stride_requests', 'stride_items', 'stride_resources',
                           'stride_quiz_attempts', 'stride_push_subscriptions', 'stride_reviews'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Owners manage their rows" on public.%I', t);
    execute format(
      'create policy "Owners manage their rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- "18:30" -> 1110
create or replace function public.stride_minutes(p text) returns int
language sql immutable set search_path = ''
as $$ select split_part(p, ':', 1)::int * 60 + split_part(p, ':', 2)::int $$;

create or replace function public.stride_secret_ok(p_secret text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.stride_tick_secret
    where hash = encode(sha256(convert_to(coalesce(p_secret, ''), 'UTF8')), 'hex')
  )
$$;
revoke all on function public.stride_secret_ok(text) from public, anon, authenticated;

-- Called by /api/tick every 5 minutes. Works out which push notifications are due, marks them sent,
-- and returns one row per notification per device. Callable with the public key, but only with the tick secret.
create or replace function public.stride_due_notifications(p_secret text)
returns table (kind text, title text, body text, url text, item_id uuid, endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  s record;
  r record;
  v_local timestamp;
  v_today date;
  v_now_min int;
  v_count int;
  v_n int;
  v_first record;
  v_item_min int;
  v_qs int;
  v_qe int;
  v_quiet boolean;
begin
  if not public.stride_secret_ok(p_secret) then
    raise exception 'invalid secret' using errcode = '28000';
  end if;

  for s in
    select st.* from public.stride_settings st
    where exists (select 1 from public.stride_push_subscriptions ps where ps.user_id = st.user_id)
  loop
    v_local := now() at time zone s.time_zone;
    v_today := v_local::date;
    v_now_min := extract(hour from v_local)::int * 60 + extract(minute from v_local)::int;
    v_count := case when s.sent_on = v_today then s.sent_count else 0 end;
    v_qs := public.stride_minutes(s.quiet_start);
    v_qe := public.stride_minutes(s.quiet_end);

    -- Morning brief, once a day from wake time.
    if s.brief_sent_on is distinct from v_today and v_now_min >= public.stride_minutes(s.wake) then
      select count(*) into v_n from public.stride_items i
        where i.user_id = s.user_id and i.status = 'planned' and (i.starts_at at time zone s.time_zone)::date = v_today;
      select i.title, i.starts_at into v_first from public.stride_items i
        where i.user_id = s.user_id and i.status = 'planned' and (i.starts_at at time zone s.time_zone)::date = v_today
        order by i.starts_at limit 1;
      if v_n > 0 then
        return query
          select 'brief'::text,
                 format('%s %s today', v_n, case when v_n = 1 then 'thing' else 'things' end),
                 format('First: %s at %s', v_first.title, to_char(v_first.starts_at at time zone s.time_zone, 'HH24:MI')),
                 '/'::text, null::uuid, ps.endpoint, ps.p256dh, ps.auth
          from public.stride_push_subscriptions ps where ps.user_id = s.user_id;
        v_count := v_count + 1;
      end if;
      update public.stride_settings set brief_sent_on = v_today where user_id = s.user_id;
    end if;

    -- Evening check-in, once a day from 21:00, only if something is still unmarked.
    if s.checkin_sent_on is distinct from v_today and v_now_min >= 21 * 60 then
      select count(*) into v_n from public.stride_items i
        where i.user_id = s.user_id and i.status = 'planned' and i.starts_at <= now()
          and (i.starts_at at time zone s.time_zone)::date = v_today;
      if v_n > 0 then
        return query
          select 'checkin'::text,
                 format('%s %s left today', v_n, case when v_n = 1 then 'thing' else 'things' end),
                 'Mark what you did, or skip it. Tomorrow is planned either way.'::text,
                 '/'::text, null::uuid, ps.endpoint, ps.p256dh, ps.auth
          from public.stride_push_subscriptions ps where ps.user_id = s.user_id;
        v_count := v_count + 1;
      end if;
      update public.stride_settings set checkin_sent_on = v_today where user_id = s.user_id;
    end if;

    -- Reminders for items starting in the last 30 minutes. Two slots a day stay reserved for the brief and check-in.
    for r in
      select i.id, i.title, i.starts_at, i.minutes, coalesce(p.remind, true) as remind
      from public.stride_items i left join public.stride_plans p on p.id = i.plan_id
      where i.user_id = s.user_id and i.status = 'planned' and i.notified_at is null
        and i.starts_at <= now() and i.starts_at > now() - interval '30 minutes'
      order by i.starts_at
    loop
      v_item_min := extract(hour from r.starts_at at time zone s.time_zone)::int * 60
                    + extract(minute from r.starts_at at time zone s.time_zone)::int;
      v_quiet := case when v_qs < v_qe then v_item_min >= v_qs and v_item_min < v_qe
                      else v_item_min >= v_qs or v_item_min < v_qe end;
      if r.remind and not v_quiet and v_count < s.daily_cap - 2 then
        return query
          select 'item'::text, r.title, format('%s min · now', r.minutes), '/'::text, r.id, ps.endpoint, ps.p256dh, ps.auth
          from public.stride_push_subscriptions ps where ps.user_id = s.user_id;
        update public.stride_items set notified_at = now() where id = r.id;
        v_count := v_count + 1;
      end if;
    end loop;

    update public.stride_settings set sent_on = v_today, sent_count = v_count where user_id = s.user_id;
  end loop;
end;
$$;
revoke all on function public.stride_due_notifications(text) from public;
grant execute on function public.stride_due_notifications(text) to anon, authenticated;

-- A push service said this device is gone (HTTP 404/410).
create or replace function public.stride_drop_subscription(p_secret text, p_endpoint text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.stride_secret_ok(p_secret) then
    raise exception 'invalid secret' using errcode = '28000';
  end if;
  delete from public.stride_push_subscriptions where endpoint = p_endpoint;
end;
$$;
revoke all on function public.stride_drop_subscription(text, text) from public;
grant execute on function public.stride_drop_subscription(text, text) to anon, authenticated;

-- The private calendar feed: scheduled items for whoever owns the token, from 2 weeks ago to 2 months ahead.
create or replace function public.stride_calendar(p_token text)
returns table (id uuid, title text, starts_at timestamptz, minutes int, status text)
language sql stable security definer set search_path = ''
as $$
  select i.id, i.title, i.starts_at, i.minutes, i.status
  from public.stride_items i
  join public.stride_settings s on s.user_id = i.user_id
  where s.calendar_token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
    and i.starts_at between now() - interval '14 days' and now() + interval '60 days'
  order by i.starts_at
$$;
revoke all on function public.stride_calendar(text) from public;
grant execute on function public.stride_calendar(text) to anon, authenticated;
