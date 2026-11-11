# ResumeBuilder

**AI Resume Builder & Job Matching** — a clean, responsive career dashboard inspired by modern mint-and-white SaaS layouts.

## Features
- **Resume Builder:** add personal details, experience, education, and skills; live resume preview; browser Print → Save as PDF.
- **ATS Checker:** honest, local heuristic scoring based on content completeness and optional job description keyword overlap (not a guarantee of passing a real ATS).
- **AI Tools:** enhance resume summaries, create cover letters, and request interview feedback via **Gemini or OpenAI**.
- **Job Matching:** skill-match estimates against clearly labeled **sample roles** (not live vacancies).
- **Application Tracker:** add applications and update statuses.
- **Authentication:** Google OAuth and email one-time passwords via Supabase Auth.
- **Data:** demo workspace uses browser localStorage; signed-in workspace stores data in **your separate Supabase PostgreSQL project**, protected by row-level security.

## Stack

Next.js 16, TypeScript, React 19, Tailwind CSS 4, Lucide, Supabase Auth/PostgreSQL, Gemini or OpenAI. **Nothing is deployed to Vercel.**

## Local setup

1. Install Node.js 20.9+ (Node 22 recommended).
2. Clone this repository, open the folder, then run:

   \`\`\`bash
   npm install
   cp .env.example .env.local
   npm run dev
   \`\`\`

   On Windows PowerShell, use \`Copy-Item .env.example .env.local\`.

3. Open **http://localhost:3000**. Demo mode runs without API keys. All sample profiles, applications, and jobs are illustrative.
4. For real accounts, **create a NEW Supabase project specifically for ResumeBuilder**. Do not reuse the SKVASRA project or its keys.
5. Paste \`supabase/schema.sql\` into **your new project's SQL Editor** and run it once. The tables use user ownership and RLS.
6. In your new Supabase project, enable **Authentication → Providers → Google** and configure Google OAuth credentials if you want Google login. Add the allowed development origin and callback paths according to your Supabase OAuth guide. Set **Site URL** to \`http://localhost:3000\` while developing and add **Redirect URLs** for \`http://localhost:3000/auth/callback\`.
7. Enable Email provider. For **six-digit email OTP**, customize the email template to display \`{{ .Token }}\` instead of only a magic link (refer to Supabase Auth docs). Verify rate limits, SMTP quota, and email delivery before public launch.
8. In \`.env.local\`, set \`NEXT_PUBLIC_SUPABASE_URL\` and \`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\` from **the new project**. These are intended to be public. Restart the dev server.
9. For AI, set **either** \`GEMINI_API_KEY\` or \`OPENAI_API_KEY\` in \`.env.local\`. **Never prefix private AI keys with NEXT_PUBLIC_ and never commit .env.local.** AI endpoints require a signed-in Supabase user.
10. Run \`npm run typecheck\` and \`npm run build\` for checks.

## Security & limitations

- All user-data tables have RLS ownership policies and \`anon\` access revoked.
- API keys for Gemini/OpenAI stay on the server; requests require authentication.
- Before a public release, implement durable per-user AI rate limits/usage controls, cost caps, anti-abuse monitoring, and provider quota handling.
- The job recommendation cards are **examples**, not live job openings. A real job API integration would be a separate feature.
- ATS numbers are heuristic guidance, not outcomes confirmed by an employer's ATS software.
- Print → Save as PDF uses the browser print dialog; this project does not offer a cloud PDF conversion backend.
- Demo data stays in localStorage on that browser. Signing up does **not** automatically import demo data into your account.
- The Supabase SQL is included for you to apply to your **new** project after it exists. No database was created or changed by this commit.

## Deployment

Not deployed by design. The code can later be hosted with Vercel or another Next.js-compatible host **only after you choose to deploy** and provide separate production environment variables and redirect URLs.
