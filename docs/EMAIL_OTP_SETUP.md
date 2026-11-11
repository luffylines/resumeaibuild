# ResumeBuilder 6-digit email verification and professional templates

**Configure in the dedicated ResumeBuilder Supabase project only.** Supabase Auth sends these emails. Resend can deliver them via Supabase Custom SMTP after the sending domain is verified.

## Enable the correct six-digit email OTP

1. Go to **Authentication → Email Templates** in that Supabase project.
2. **Confirm Sign Up:** paste the HTML from `email-templates/confirm-signup.html`. It uses `{{ .Token }}` (the actual Supabase-generated 6-digit code).
3. **Magic Link / OTP:** paste the HTML from `email-templates/magic-link-otp.html` (also uses `{{ .Token }}`).
4. **Reset Password:** paste `email-templates/reset-password.html`, which correctly uses `{{ .ConfirmationURL }}` for recovery.
5. Save each template and its subject (e.g. **Verify your ResumeBuilder email**, **Your ResumeBuilder sign-in code**, **Reset your ResumeBuilder password**).
6. Set **Authentication → URL Configuration → Site URL** to `https://resumeaibuild-virid.vercel.app`. Allow `/auth/callback` and `/auth/reset` under Redirect URLs. Do not use temporary Vercel deployment hostnames.
7. Set up a Resend-verified sender in **Authentication → SMTP Settings** for dependable delivery. Vercel environment variables alone do not reconfigure Supabase Auth emails.

## Code + copy/paste

The email's large 6-digit number is user-selectable. Gmail and other email clients usually block JavaScript, so a literal interactive **Copy** button in the email is not reliable. The website's confirmation form provides six visual slots, accepts normal paste / iOS one-time-code autofill, and provides a **Paste code** control where the browser's clipboard permissions allow it. Users can always long-press and paste into the field.

The six slots remain neutral while typing, change red after an invalid/expired code, and only turn green after Supabase Auth **actually verifies** the one-time code. Codes are never generated client-side or accepted just because they are six digits.

## End-to-end test

- Create a test user with password.
- Confirm they receive a **six-digit** email (not just a confirmation link).
- Enter an incorrect code: form should display red, and never authenticate.
- Enter the correct fresh code: Supabase `verifyOtp({email,token,type:'email'})` accepts it and the form proceeds to the dashboard.
- Repeat for **Use an email OTP instead** on login. Test resend throttling/expiry and a previously verified account.
- If email still shows a link, the correct Supabase **email template has not been updated**.
- Ensure the test is on the correct ResumeBuilder Supabase project, not SKVASRA.

Note: this repository contains email HTML templates only; **nothing here automatically modifies live Supabase email templates**.
