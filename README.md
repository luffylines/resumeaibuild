# ResumeBuilder

**AI Resume Builder & Professional CV Templates** — a clean, responsive career dashboard with a modern responsive purple-and-white SaaS interface.

## Screens and routes

| Path | Screen | Access |
|---|---|---|
| `/` | Public marketing homepage: features, templates, pricing, FAQ | Everyone |
| `/guide` | Registration, verification, login walkthrough | Everyone |
| `/demo` | Interactive self-paced product tour | Everyone |
| `/signup` | Google or email/password registration | Everyone |
| `/login` | Google, email/password, email OTP | Everyone |
| `/app` | Career dashboard, resume editor, ATS checker, photo templates, interview practice | Demo or signed-in |
| `/admin/login` | Dedicated administrator email/password login | Public (requires separate Supabase for live sign-in) |
| `/admin` | Admin Dashboard, reporting, Excel downloads and audit logs | Server-verified administrator only; redirects to `/admin/login` otherwise |
| `/admin/preview` | Sample-only Admin Dashboard | Public demo ONLY when Supabase is not configured |

## Features
- **Resume Builder:** add personal details, experience, education, and skills; live resume preview; browser Print → Save as PDF.
- **ATS Checker:** honest, local heuristic scoring based on content completeness and optional job description keyword overlap (not a guarantee of passing a real ATS).
- **AI Tools:** enhance resume summaries, create cover letters, and request interview feedback via **Gemini or OpenAI**.
- **Authentication:** Google OAuth and email one-time passwords via Supabase Auth.
- **Data:** demo workspace uses browser localStorage; signed-in workspace stores data in **your separate Supabase PostgreSQL project**, protected by row-level security.

## Stack

Next.js 16, TypeScript, React 19, Tailwind CSS 4, Lucide, Supabase Auth/PostgreSQL, Gemini or OpenAI. **Nothing is deployed to Vercel.**

## Local setup

1. Install Node.js 20.9+ (Node 22 recommended).
2. Clone this repository, open the folder, then run:

   ```bash
   npm install
   cp .env.example .env.local
   npm run dev
   ```

   On Windows PowerShell, use `Copy-Item .env.example .env.local`.

3. Open **http://localhost:3000**. Demo mode runs without API keys. All sample profiles and demo resumes are illustrative.
4. For real accounts, **create a NEW Supabase project specifically for ResumeBuilder**. Do not reuse the SKVASRA project or its keys.
5. Run `supabase/schema.sql` and then `supabase/admin.sql` in **the new ResumeBuilder project's SQL Editor only**. Never run these in SKVASRA.
6. In your new Supabase project, enable **Authentication → Providers → Google** and configure Google OAuth credentials if you want Google login. Add the allowed development origin and callback paths according to your Supabase OAuth guide. Set **Site URL** to `http://localhost:3000` while developing and add **Redirect URLs** for `http://localhost:3000/auth/callback`.
7. Enable Email provider. For **six-digit email OTP**, customize the email template to display `{{ .Token }}` instead of only a magic link (refer to Supabase Auth docs). Verify rate limits, SMTP quota, and email delivery before public launch.
8. In `.env.local`, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from **the new project**. These are intended to be public. Restart the dev server.
9. Set `SUPABASE_SECRET_KEY` (or legacy `SUPABASE_SERVICE_ROLE_KEY`) for server-only admin API access. After creating your own signup account, locate its UUID under **Authentication → Users**, then execute `insert into public.admin_users(user_id) values ('YOUR_AUTH_USER_UUID');` in the new project's SQL editor. Never use user email or editable metadata as proof of admin rights.
10. For AI, set **either** `GEMINI_API_KEY` or `OPENAI_API_KEY` in `.env.local`. **Never prefix private AI keys with NEXT_PUBLIC_ and never commit .env.local.** AI endpoints require a signed-in Supabase user.
11. Run `npm run typecheck` and `npm run build` for checks.

## Security & limitations

- All user-data tables have RLS ownership policies and `anon` access revoked.
- API keys for Gemini/OpenAI stay on the server; requests require authentication.
- Before a public release, implement durable per-user AI rate limits/usage controls, cost caps, anti-abuse monitoring, and provider quota handling.
- The job recommendation cards are **examples**, not live job openings. A real job API integration would be a separate feature.
- ATS numbers are heuristic guidance, not outcomes confirmed by an employer's ATS software.
- Print → Save as PDF uses the browser print dialog; this project does not offer a cloud PDF conversion backend.
- Demo data stays in localStorage on that browser. Signing up does **not** automatically import demo data into your account.
- The Supabase SQL is included for you to apply to your **new** project after it exists. No database was created or changed by this commit.

## Deployment

Not deployed by design. The code can later be hosted with Vercel or another Next.js-compatible host **only after you choose to deploy** and provide separate production environment variables and redirect URLs.

## Preview vs live functionality

- **Demo (no database):** homepage, how-to guide, editable resume, template selection, printable PDF, local ATS scoring, demo sample jobs and tracking. the `/admin/login` page links to `/admin/preview`, which is sample-only and not protected by a password; the live `/admin` is protected by real Supabase authentication and the dedicated admin role; the figures (e.g. 1,248 users) are NOT real. Demo jobs are locally editable only.
- **After setting up a NEW Supabase project:** real Google/email authentication, secure per-user resumes, user plan labels, ATS reports and activity logs. The live admin panel requires a manually approved user ID plus a private server secret.
- **After adding Gemini or OpenAI:** resume draft suggestions, cover letters and interview response feedback. AI-generated claims must be reviewed by users.
- **Not yet integrated:** external live vacancy feeds, video/voice avatar interviewer, actual subscription billing, AI provider cost metering, and production-grade per-user rate limiting. The app does not fake live employer vacancies or bill users.

Do not deploy publicly until the production auth redirects, project secrets, usage limits and security have been tested.

## 2026 reference-image UI update

The purple-and-white layouts follow the supplied homepage, user dashboard, admin dashboard and feature-panel references. Included are the five-step Resume Builder wizard, live resume preview, 32 unique resume layouts, editable AI cover letters (tone/copy/download), AI Interview robot panel with optional local camera and browser voice features, settings tabs, six-digit OTP UI, password recovery, illustrated signup guide, and an interactive product demo.

**Important:** this is an implemented interpretation of the images, not a verified pixel-for-pixel copy. Third-party fonts, portrait photographs, live employer feeds, payments, avatar video calls, and other concepts in the artwork cannot be assumed to be available. A separate ResumeBuilder Supabase project and AI API key are required for real account persistence and AI responses. Production deployment has not been performed.

The GitHub Actions workflow runs TypeScript, a production build, and HTTP smoke tests for the public pages, preview dashboard, and preview admin route. It does not test live OAuth, Supabase emails, or AI provider requests without the required private credentials.


## Resume template library (32 unique layouts, 20 photo-ready)

Templates are visible on the public homepage and in Dashboard → Templates. Upload a portrait only if you choose to: the wizard supports JPEG/PNG/WebP up to 8 MB, resizes to a centered 480 × 480 JPEG before storing the image with the resume content, and supports Remove/Replace. No photo is needed to use any template. The designs include Modern Violet, Modern Blue, Modern Teal, Modern Coral, Modern Slate, Modern Sky, Modern Emerald, Modern Plum, Professional Indigo, Executive Navy, Executive Charcoal, Classic Professional, Minimal ATS, Clean Gray, Graduate Fresh, Timeline Pro, Tech Split, Creative Sidebar, Elegant Editorial and Bold Header, plus eight photo-ready designs: Navy Portrait Pro, Studio Beige CV, Executive Portrait, Blue Profile, Modern Portrait, Editorial Beige, Black & Gold CV, and Graduate Profile.

- Open /app?section=templates to compare scaled document previews, filter by category, search, or inspect a larger preview.
- Use Template carries the chosen design into the five-step builder without replacing your content.
- You can change designs on the Generate step, then save to persist the design ID in browser demo storage or the separate Supabase project.
- Print PDF uses the same document design. Choose browser Save as PDF, A4 paper, 100% scale, and verify pagination before applying.
- For online applications, start with a single-column template from Modern, Professional or Minimal. Split columns, sidebars and timelines are for visually oriented applications and may parse differently in an ATS. Heuristic ATS scores do not guarantee hiring.


## Administrator access, audit logging, and Excel exports

1. Go to **/admin/login**. The screen uses the same Supabase project as ResumeBuilder but checks the server-managed **admin_users** table. Passwords are never kept in this repository. Google/user login does NOT automatically grant admin permission. The real dashboard is /admin, while /admin/preview is sample data only before database setup.
2. Create your separate ResumeBuilder Supabase project and run **supabase/schema.sql**, then **supabase/admin.sql**, in that project's SQL Editor. Do not run these in SKVASRA. Once you have registered yourself, manually add your own authenticated user UUID:
   `insert into public.admin_users(user_id) values ('YOUR_RESUMEBUILDER_USER_UUID');`
3. Set the new project's **NEXT_PUBLIC_SUPABASE_URL**, **NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY**, and private **SUPABASE_SECRET_KEY** only in `.env.local`. Do not share or commit the secret. Restart the dev server.
4. In the Admin Dashboard, the reporting-period selector belongs on Dashboard, Activity Logs, ATS and Usage, not the global navigation. Choose **Last 7 / 30 / 90 Days / All Time**. Total Users/Resumes are all-time totals while audit, ATS and AI event counts use the selected period.
5. The **Download Excel** button generates real `.xlsx` files. Authorized live admin exports query the database (capped at 2,000 rows per dataset), and a download event is itself audited. Preview exports contain illustrative data only. Columns include action, actor, date/time, IP (when available), and browser information. Never use an exported spreadsheet as proof of someone's identity.
6. Activity Logs include server-verified administrative actions (job saves/deletes, plan changes, exports, admin login), plus explicitly labeled *client-reported* user actions such as resume saves, application updates and ATS checks. Client-reported descriptions are not independently verified.
7. IP addresses can be absent during local development and may depend on trusted hosting proxies. Proxy headers can be incomplete/spoofed; IPs are **not** used as administrator credentials, geolocation, identity verification or access control. Provide an appropriate privacy notice, restrict exports, and set data-retention rules before public launch. Backups and encryption are your own hosting/database responsibilities.
8. Optional portraits are stored with the resume content as compressed data URLs. Resumes are RLS-protected when using real Supabase. Only upload photos you have permission to use; portraits are not required for ATS-friendly applications.

This code has not been deployed to Vercel or connected to a new Supabase project. Live login, database logging, IP capture and Excel export require your own separate project and keys; the demo paths are only sample screens.


## Template grouping and full-size exports (November 2026)

Color-only variations stay grouped. The gallery now shows **32 truly distinct layout cards**, including **20 photo-ready styles** shown first. Existing legacy template IDs remain supported for saved-resume compatibility. Select an accent color and page background from each card or from Build Resume → Generate; choices persist with the resume. The printable design uses the same CSS styles as the preview.

Under **Build Resume → Generate**, the four aligned export buttons are: **Download PDF** (selectable text, no browser URL/date/footer), **Download DOCX** (editable paragraphs/headings for Word and Canva import), **Download PNG** (high-resolution image of the resume), and **Print** (native browser dialog). Browser print headers and footers are controlled by the browser: choose A4 and turn OFF 'Headers and footers' if your print preview displays a localhost URL, date or page counter. The page CSS also requests zero printer margins, but some browsers/printers can override this. The PDF and DOCX files are generated from the resume data rather than a screenshot, to keep the text editable. Fonts and complex layout may reflow when importing DOCX or PDF into Canva; verify the design after importing.

PNG is a flattened image, so Canva cannot edit its resume text. For Canva, upload the PDF (select text if Canva makes the elements editable) or DOCX, then adjust elements in Canva. No direct Canva API account connection is configured.


## Optional CV sections and template-aware content (2026-11-11)

In **Build Resume → Skills** add and edit content beyond the standard name, profile summary, work experience, education and skills:

- Certifications & Training (title, issuer, year, details)
- Professional References (name, role, company, contact — only with permission)
- Languages and proficiency
- Projects / portfolio
- Awards & achievements
- Volunteer experience
- Additional Information
- Any custom section (your own title and editable content)

Templates suggest sections in a different order based on their design (for example, graduate layouts lead with education, creative sidebars can put skills/languages in the side column, and editorial layouts emphasize experience). These are **suggestions, not restrictions**. If you enter information that a template does not normally include, the populated section appears automatically in the live preview and **PDF, editable DOCX, PNG and Print** exports. If no information is entered, that section is hidden from the final resume; blank placeholders are not exported. Changing templates does not delete section data. The same shared section registry drives HTML previews and document exports, preventing mismatched missing content.

Existing JSON resumes remain valid: all extra arrays and the Additional Information text are optional. Both demo browser storage and the dedicated Supabase \`resumes.content\` JSONB field persist the extra sections without a database schema migration. All details are user-provided; nothing is invented as qualifications or references. Review your resume before applying.


## Canva handoff and high-resolution PNG repair (November 2026)

The **Generate** step in the resume wizard now uses a polished design picker with real scaled documents, a responsive preview, balanced export buttons, and an **Edit in Canva** card.

**Edit in Canva** prepares a selectable-text PDF download and opens https://www.canva.com/pdf-editor/ in a new browser tab so the user can import the PDF there. This is intentionally a **handoff**, not an automatic upload: Canva controls its accounts and imported designs, and directly saving a generated design to someone's Canva account requires an authorized Canva REST API integration and OAuth 2.0. The app does **not** request the user's Canva password and does not send resume data directly to Canva. If the new tab is blocked, the wizard displays a backup Canva link.

For the PNG export, the app now renders a temporary, actual-size A4-proportioned resume document, waits for fonts and portrait images, and captures the document rather than the offscreen wrapper. It exports at 2× resolution and measures the full rendered height so longer content is not clipped. The capture node is always removed afterward. Browser tests check PNG pixel dimensions, color diversity, and real image content instead of checking only the file signature. PNG images are not text-editable in Canva; prefer the PDF or DOCX import for further editing.

**Print** still depends on the browser's print dialog. For browser-supplied date, page number or localhost URL, disable "Headers and footers" when printing.


## Simplified ResumeBuilder workspace — November 11, 2026

Job Matching and Job Tracker are no longer displayed or loaded in the client app. The admin sidebar, dashboard usage reports and Excel exports no longer expose Job Posts or application counts. The homepage and demo now focus on resume creation, ATS checking, cover letters, interview practice and professional templates. Historical job-related database tables and local-storage keys are **left untouched** to avoid deleting data; no migrations or destructive database operations are required.

Twelve additional original professional portrait layouts have been implemented, providing 20 photo-ready designs out of 32 unique layout cards. Photo-ready options appear **before** text-only templates in the gallery and Generate step. Both also include a **With Photo** filter. Sample gallery portraits are **illustrative placeholders only** and are never inserted into full resumes unless the user uploads an actual picture. On the Profile step, JPEG/PNG/WebP portrait upload is optional; the user may remove it at any time. All populated resume sections (summary, experience, education, certifications, references, projects, custom sections) remain available in every layout. Uploaded photos are stored with the user's resume content.

Note: PDF/DOCX files are still generated as text-based documents to support editing and ATS use; those formats may simplify complex visual decorations compared with the HTML design. PNG/Print capture the visual layout. Canva import is a PDF download and editor handoff, not direct Canva OAuth sync.

## Live Interview Practice voice and required API setup (November 2026)

**Browser speech-to-text:** Start Speaking uses browser Web Speech and requires microphone permission. No API key is needed. Read Question Aloud and Next Question use browser text-to-speech.

**Optional Record with AI (backup):** The user explicitly starts a recording for up to 40 seconds. The app sends it to authenticated /api/transcribe, using GROQ_API_KEY with whisper-large-v3-turbo first, or GEMINI_API_KEY, or OPENAI_API_KEY. The user can review and edit the returned transcript. Audio is not persisted by the app and is sent only after the user chooses the backup recorder. Use no confidential interview content without understanding the AI provider data policies.

AI transcription requires a signed-in Supabase account plus server-only SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) so the API can check a limit of 15 recordings per rolling 24 hours in the existing ai_events table. These are basic non-atomic limits, not a comprehensive production abuse or budget system. Provider spending and rate limits should also be enabled. Run the SQL files included in this repo in the new ResumeBuilder database.

**AI feedback and AI resume generation** use GEMINI_API_KEY (preferred when present) or OPENAI_API_KEY. The environment variable key must be written exactly GEMINI_API_KEY, not Gemini API.

**Email OTP with Resend:** Setting MAIL_MAILER, MAIL_FROM_NAME, MAIL_FROM_ADDRESS or RESEND_API_KEY in Vercel alone does not configure Supabase Auth mail. In the ResumeBuilder Supabase project, navigate to Authentication > SMTP Settings and use Resend host smtp.resend.com, port 465 (SSL), username resend, password = Resend API key, sender email from a verified Resend domain, sender name ResumeBuilder. In Authentication > Email Templates, customize Magic Link / OTP to include the six-digit {{ .Token }}. Configure Site URL and Redirect URLs for your real Vercel address.

Redeploy Vercel when adding/updating environment variables and after code changes. Never put secret API keys in NEXT_PUBLIC_ variables, commits, or frontend JavaScript.


## Autosave and recovery

The editor automatically keeps a per-account browser draft while typing; authenticated users' resume drafts are also debounced to their own rows in the separate ResumeBuilder Supabase database (RLS owner policies are required). If navigation occurs before the network write, the newer browser copy is restored and reconciled on next login/open. Status messages distinguish device-only save, syncing, synchronized account save and errors.

The resume wizard restores the selected step (1–5) and "Describe your background" prompt for each resume. ATS job-description and Cover Letter form inputs are restored for the same account and browser. The 10-question Interview Practice restores the selected resume, question index, transcripts, individual answers, completion state and generated feedback. Interview progress is **local to the current browser/device**, not synced to another computer. Uploading a new resume photo can exceed browser storage limits; a quota error is shown rather than claiming success. Avoid using a shared computer for sensitive resume/interview content, and clear browser site data if needed.

**New Resume** starts a new draft with a different ID; prior edited drafts remain listed in My Resumes. **Reset Interview** intentionally starts an empty interview and replaces that browser's saved interview progress. **Delete Resume** removes its autosaved cache as well as its own database record. No new table or migration is needed.
