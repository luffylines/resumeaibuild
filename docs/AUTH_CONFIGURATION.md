# ResumeBuilder — production authentication checklist

Use the **dedicated ResumeBuilder Supabase project**, not SKVASRA or another project.

## 1. Connect Resend for signup and OTP emails

Supabase Auth sends these messages. Adding RESEND_API_KEY and MAIL_* to Vercel alone does not configure the Supabase Auth SMTP service.

In **Supabase → Authentication → SMTP Settings**:

- Enable custom SMTP
- Host: **smtp.resend.com**
- Port: **465** (SSL)
- Username: **resend**
- Password: **your Resend API key**, entered privately in Supabase
- Sender email: **noreply@thesis-studio.me** (only after verifying thesis-studio.me in Resend)
- Sender name: **ResumeBuilder**

Confirm the sending domain's SPF/DKIM verification in Resend → Domains. Keep email confirmation enabled. The default Supabase email service is restricted to roughly two emails per hour; custom SMTP enables configurable rate limits. Preserve sensible anti-spam limits.

## 2. Configure Google / Gmail login

Create an OAuth 2.0 **Web Application** credential under **Google Cloud → Google Auth Platform → Clients**.

- Authorized JavaScript origin: **https://resumeaibuild-resume-e32a.vercel.app** (or your actual stable production hostname)
- Authorized redirect URI: **https://vuvxgkmbsiecdromzysq.supabase.co/auth/v1/callback**

The Google redirect URI goes to **Supabase**, not directly to the Vercel callback. If the Google OAuth consent screen is in Testing, add your Gmail address under Test Users, or publish with an appropriate audience for public access.

In **Supabase → Authentication → Sign In / Providers → Google**:
- Enable Google
- Enter the Google Cloud OAuth Web client ID and client secret
- Save

Do not put Google client secrets into frontend code.

## 3. Redirect and Site URLs

In **Supabase → Authentication → URL Configuration**:
- Site URL: **https://resumeaibuild-resume-e32a.vercel.app**
- Redirect URL: **https://resumeaibuild-resume-e32a.vercel.app/auth/callback**
- Redirect URL: **https://resumeaibuild-resume-e32a.vercel.app/auth/reset**

Replace with your **real stable canonical production hostname** if different. For development, you may also allow http://localhost:3000/auth/callback and http://localhost:3000/auth/reset, plus port 3001 if used locally.

## 4. Email & password settings

In **Supabase → Authentication → Sign In / Providers → Email**, enable the Email provider and allow new user signups (Auth General settings). Keep **Confirm Email** enabled. For password signups, new users must confirm their email before signing in. For six-digit Email OTP, configure the relevant email templates with the Supabase template variable shown in official docs (Token).

## 5. Vercel connection

Add the ResumeBuilder project's values in **Vercel → Settings → Environment Variables**:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SECRET_KEY (server-side only)
- GEMINI_API_KEY, GROQ_API_KEY (optional AI features)

Redeploy after changing variables. Google OAuth credentials and Resend Auth SMTP credentials must be stored/configured in Supabase; Vercel variables alone do not activate them.

## 6. Test without burning the quota

1. Confirm verified sending domain and custom SMTP before repeatedly attempting registration.
2. Open production /signup in a private browser. Create one account with **email + password**.
3. Check the signup confirmation email and confirm it. Then sign in using /login.
4. Separately test **Continue with Google** and return to /app.
5. If testing OTP, wait for the countdown rather than clicking several times.
6. If emails fail, check **Supabase Authentication logs**, **Resend Email logs**, sender domain verification and Auth Rate Limits.
7. If Google fails, check the Google provider setup, OAuth consent screen audience/testing status, and redirect URIs.

A successful build and UI tests do not prove real Google login or SMTP delivery. One real end-to-end test in your accounts is still necessary.

References:
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/rate-limits
- https://supabase.com/docs/guides/auth/social-sign-in/auth-google
- https://supabase.com/docs/guides/auth/redirect-urls
- https://resend.com/changelog/smtp-service

## Verification email opens Vercel login instead of ResumeBuilder

Vercel Authentication (Deployment Protection) is separate from ResumeBuilder authentication and may protect preview/deployment URLs.

1. Open Vercel → Project → Settings (or Security) → Deployment Protection. Use Standard Protection for a public production domain; preview builds can remain protected.
2. Copy your real production domain from Vercel → Project → Settings → Domains. Avoid the long randomly generated individual deployment hostname.
3. Set NEXT_PUBLIC_SITE_URL under Vercel → Environment Variables → Production to that public production origin without an /auth path. Redeploy after editing.
4. Set Supabase → Authentication → URL Configuration → Site URL to that production origin. Allow that host's /auth/callback and /auth/reset paths.
5. The Confirm Sign Up email template should use {{ .ConfirmationURL }} unless a custom token_hash confirmation route is deliberately implemented. Do not hardcode preview URLs in email HTML.
6. First verify the production hostname loads in an incognito window without a Vercel login. Then request a fresh confirmation email and open it once.

The code uses src/lib/auth-return-url.ts for OAuth, signup, email OTP and password recovery. NEXT_PUBLIC_SITE_URL must be a public origin; without it, the browser's current origin is used.

https://vercel.com/docs/deployment-protection
https://supabase.com/docs/guides/auth/redirect-urls


## 7. Administrator email and Google sign-in

The **Admin Login** page now supports both **Continue with Google** and email/password sign-in. Both methods authenticate through the **same dedicated ResumeBuilder Supabase Auth project**, not a separate hardcoded admin password. After successful authentication, the server checks `public.admin_users.user_id` against the authenticated Supabase Auth user UUID. **No user becomes an admin merely by using Google or matching an email address.**

### Required redirects (correct ResumeBuilder project ONLY)

- Vercel `NEXT_PUBLIC_SITE_URL` (Production): `https://resumeaibuild-virid.vercel.app`
- Supabase Authentication → URL Configuration → Site URL: `https://resumeaibuild-virid.vercel.app`
- Redirect URL for normal users: `https://resumeaibuild-virid.vercel.app/auth/callback`
- Redirect URL for Admin Google sign-in: `https://resumeaibuild-virid.vercel.app/auth/callback?next=admin`
- Password recovery: `https://resumeaibuild-virid.vercel.app/auth/reset`

For OAuth callbacks with query parameters, explicitly add the admin callback URL to the Supabase Redirect URLs allowlist (or add a suitably narrow trusted wildcard rule). Google Cloud's Authorized Redirect URI must point to **the correct Supabase project's** `https://<project-ref>.supabase.co/auth/v1/callback`, *not* directly to Vercel.

### Why a correct-looking admin email/password can fail

Supabase returns `invalid_credentials` before any admin-role check when the submitted email/password combination is not accepted by **that project's Supabase Auth**. This can also occur when the user originally registered only with Google and never set an email/password, or signed up in a different Supabase project. The code cannot recover or guess an existing password.

To diagnose without disclosing credentials:
1. In the **correct ResumeBuilder Supabase dashboard**, open **Authentication → Users** and find your intended admin account. Confirm the Auth provider, confirmed email status, and account UUID. Do not paste your password into a chat.
2. If the account only uses Google, use **Continue with Google**. Otherwise use **Forgot password?** to set a new password through that same Supabase Auth project; confirm recovery emails arrive before repeated attempts.
3. In the project's SQL editor, after creating `public.admin_users` through `supabase/admin.sql`, have a project owner manually authorize the correct, verified UUID:

   ```sql
   insert into public.admin_users (user_id)
   values ('UUID_FROM_AUTH_USERS')
   on conflict (user_id) do nothing;
   ```

   **Only use a UUID from the intended ResumeBuilder project.** No admin permission is automatically granted by email, Google sign-in, or `user_metadata`. Do not run this against SKVASRA or any unrelated project.
4. Ensure the `admin_users` SELECT policy allows the account to read only its own membership. If a query fails, the UI reports a role-check configuration error rather than calling the user unauthorized.
5. Sign in at `/admin/login`; Google returns through the OAuth callback, and authorized users land at `/admin`. Ordinary signed-in users are refused admin access and shown a clear message.

Check **Supabase → Authentication → Logs** for `invalid_credentials`, `email_not_confirmed`, or Google provider/callback errors. Credentials, OAuth tokens and secrets are not logged by the application. Rotate any password accidentally exposed in a screenshot.

The GitHub code and tests do not activate Google sign-in, create administrators or connect a different Supabase/Vercel project by themselves. These dashboard settings must be configured in the correct accounts.
