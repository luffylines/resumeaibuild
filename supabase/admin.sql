-- Apply ONLY inside the separate ResumeBuilder Supabase project AFTER schema.sql.
-- Enable admin access manually for ONE trusted existing user in SQL Editor:
-- insert into public.admin_users (user_id) values ('YOUR_SUPABASE_AUTH_USER_UUID');
-- Never use user_metadata, browser state, or an email string as proof of admin status.

create table if not exists public.admin_users (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
create policy "admins_can_verify_their_own_role" on public.admin_users
 for select to authenticated using ((select auth.uid())=user_id);
grant select on public.admin_users to authenticated;
revoke all on public.admin_users from anon;
-- No client INSERT, UPDATE, DELETE policies. Provision through the SQL editor only.

create table if not exists public.profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '',
 plan text not null default 'Free' check (plan in ('Free','Pro','Team')),
 created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_read_self" on public.profiles
 for select to authenticated using ((select auth.uid())=user_id);
grant select on public.profiles to authenticated;
revoke all on public.profiles from anon;
-- Plan updates are server-admin-only, not writable from the browser.

create table if not exists public.job_posts (
 id uuid primary key,
 role text not null,
 company text not null,
 location text not null default '',
 type text not null default 'Full-time',
 keywords text[] not null default '{}',
 is_active boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists job_posts_active_idx on public.job_posts(is_active,created_at desc);
alter table public.job_posts enable row level security;
create policy "published_jobs_readable" on public.job_posts
 for select to authenticated using (is_active=true);
grant select on public.job_posts to authenticated;
revoke all on public.job_posts from anon;
-- Write only using the server-side admin API after an admin role check.

create table if not exists public.ats_scans (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 resume_id uuid references public.resumes(id) on delete set null,
 score int not null check(score between 0 and 100),
 created_at timestamptz not null default now()
);
create index if not exists ats_scans_owner_idx on public.ats_scans(user_id,created_at desc);
alter table public.ats_scans enable row level security;
create policy "ats_own_read" on public.ats_scans for select to authenticated using ((select auth.uid())=user_id);
create policy "ats_own_create" on public.ats_scans for insert to authenticated with check ((select auth.uid())=user_id);
grant select,insert on public.ats_scans to authenticated;
revoke all on public.ats_scans from anon;

create table if not exists public.ai_events (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 task text not null,
 created_at timestamptz not null default now()
);
create index if not exists ai_events_owner_idx on public.ai_events(user_id,created_at desc);
alter table public.ai_events enable row level security;
create policy "ai_events_own_create" on public.ai_events
 for insert to authenticated with check ((select auth.uid())=user_id);
grant insert on public.ai_events to authenticated;
revoke all on public.ai_events from anon;

create table if not exists public.activity_logs (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid references auth.users(id) on delete set null,
 action text not null,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.activity_logs enable row level security;
revoke all on public.activity_logs from anon,authenticated;
-- Read/write audit events using server-side secret only.
