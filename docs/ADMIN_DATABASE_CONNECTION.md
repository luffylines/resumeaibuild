# ResumeBuilder admin database connection checklist

**Scope: only the Supabase and Vercel projects serving https://resumeaibuild-virid.vercel.app.**
The Supabase project currently connected to the assistant is NOT the dedicated ResumeBuilder project; no connected database tables, Auth users, RLS policies, or Vercel secrets were modified.

## Why the live admin dashboard could show wrong data

The previous AdminPanel initialized real admin sessions with large hard-coded sample metrics, then kept them visible when GET /api/admin failed. Its System Status always said "Connected" on live pages. The application now starts live sessions with empty data, requires a successful authenticated Supabase API response, and shows a clear error or per-table warning instead of example counts.

The public demo preview at /admin/preview still uses sample data when no dedicated Supabase instance is configured. It is not a live database view. The regular user workspace **never** contains Admin Login or Admin Dashboard links. Direct navigation to /admin is the administrator entry point; guests and non-admin users are redirected to /admin/login.

## 1. Confirm that the correct Vercel project is used

Vercel → Project **resumeaibuild** → Settings → Environment Variables → Production. Configure values from the **same dedicated ResumeBuilder Supabase project**:

| Variable | Scope | Notes |
| --- | --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Public | https://YOUR_RESUMEBUILDER_PROJECT_REF.supabase.co |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Public | Publishable/anon key from that project |
| SUPABASE_SECRET_KEY | **Server only** | Supabase secret key for that same project (or legacy SUPABASE_SERVICE_ROLE_KEY) |
| NEXT_PUBLIC_SITE_URL | Public | https://resumeaibuild-virid.vercel.app |

Never prefix SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY with NEXT_PUBLIC_. Never paste them into code, GitHub commits, or chat. Do not use the credentials of SKVASRA or another project.

After saving the variables, deploy **the latest main commit to Production**. Changes to Vercel environment variables are not necessarily reflected in an already-running deployment.

## 2. Confirm schema, policies, and admin membership

In the correct Supabase project only:

1. Confirm / create tables using the repository's `supabase/schema.sql`, then `supabase/admin.sql`. Review existing tables and policies before applying; do not blindly rerun CREATE POLICY statements if they already exist.
2. Open Supabase → Authentication → Users and copy the authorized administrator's **UUID** (not their email, password, or Google provider identifier).
3. If the project owner explicitly intends to grant that user admin access, run in the correct project's SQL editor:

   ```sql
   insert into public.admin_users (user_id)
   values ('YOUR_VERIFIED_AUTH_USER_UUID')
   on conflict (user_id) do nothing;
   ```

4. Do **not** grant admin access automatically during login, based on a matching email, or via user-editable metadata.
5. Ensure the authenticated user's `admin_users` SELECT RLS policy is present. Other admin reporting tables are queried **only by the server-side secret key** after authorization.

Read-only diagnostic SQL to run in **that project**:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('admin_users','resumes','profiles','ats_scans','activity_logs','ai_events')
order by tablename;
```

All six tables should exist and have row-level security appropriate to their access model. If any are missing, the live admin now shows a section-specific warning instead of fabricated numbers.

## 3. Validate the right account and backend

1. Sign in at /admin/login with the admin account from **the same Supabase project**.
2. Visit /admin directly. If not logged in, the app redirects to /admin/login. If the account is not authorized, login shows a clear access error.
3. Open DevTools → Network (authenticated test account only), inspect **GET /api/admin?period=30**. Expect HTTP 200 with `source: "supabase"`, `connectionStatus: "connected"`, and **no warnings**. An HTTP 503 indicates project/secret/admin schema setup needs attention. A `partial` status indicates some reporting tables are missing or unavailable.
4. The data must match the corresponding project in Supabase, not values from Admin Preview.
5. In Vercel → Deployments, verify that the **Production** deployment references the latest `main` commit. Check Runtime/Function Logs for diagnostic resource codes, without sharing keys.
6. Check all views — Users, Resumes, ATS, Plans, Usage, Activity Logs, System Settings — and the same admin CSS on phone and desktop.

The User Growth graph now uses observed signup timestamps among the latest loaded Auth users (up to 200). It does not pretend to show a complete historical series. Billing and Pro/Ultra entitlements are separate features and remain **unimplemented** even when plan labels can be edited.

## Authorization and limitations

Server routes verify authenticated Supabase users and membership in `admin_users`. Database reporting requires a server-only key, never a browser key. A missing table, failed role query or missing secret must never grant access or silently substitute demo data.

The code cannot link the actual ResumeBuilder project by itself without its project environment configuration. Only configure this in the correct owned project; **do not** modify the connected unrelated Supabase/Vercel projects.
