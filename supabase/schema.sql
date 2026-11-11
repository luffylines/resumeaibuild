-- Run ONLY in a newly created, separate ResumeBuilder Supabase project.
-- User records are isolated by row-level security.
create table if not exists public.resumes (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null default 'Untitled Resume',
 content jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists resumes_owner_idx on public.resumes(user_id,updated_at desc);
alter table public.resumes enable row level security;
create policy "resumes_select_owner" on public.resumes for select to authenticated using ((select auth.uid())=user_id);
create policy "resumes_insert_owner" on public.resumes for insert to authenticated with check ((select auth.uid())=user_id);
create policy "resumes_update_owner" on public.resumes for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "resumes_delete_owner" on public.resumes for delete to authenticated using ((select auth.uid())=user_id);

create table if not exists public.job_applications (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 content jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists applications_owner_idx on public.job_applications(user_id,created_at desc);
alter table public.job_applications enable row level security;
create policy "applications_select_owner" on public.job_applications for select to authenticated using ((select auth.uid())=user_id);
create policy "applications_insert_owner" on public.job_applications for insert to authenticated with check ((select auth.uid())=user_id);
create policy "applications_update_owner" on public.job_applications for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "applications_delete_owner" on public.job_applications for delete to authenticated using ((select auth.uid())=user_id);

grant select,insert,update,delete on public.resumes,public.job_applications to authenticated;
revoke all on public.resumes,public.job_applications from anon;
