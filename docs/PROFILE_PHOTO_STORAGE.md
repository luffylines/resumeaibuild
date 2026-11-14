# ResumeBuilder — make profile pictures persist across devices

## New authenticated server upload (November 2026)

The website now provides `/api/profile/avatar` with GET/POST/DELETE.
This is the **preferred** upload and reload path when a **server-only**
`SUPABASE_SECRET_KEY` or legacy `SUPABASE_SERVICE_ROLE_KEY` is configured
in the **correct ResumeBuilder** Vercel Production environment.

- POST checks the existing signed-in user's server session, accepts only
  a resized JPEG no bigger than 1 MB, creates a **private**
  `profile-avatars` bucket when missing, uploads to
  `<authenticated-user-id>/avatar.jpg`, then verifies the object can be
  read back before returning success.
- GET issues a short-lived signed URL for this authenticated user's own
  image. This is what makes avatar refresh and re-login reliable.
- DELETE removes only this authenticated user's image.
- Every write requires a same-origin request; an unauthenticated request
  cannot change files.
- The server key never appears in a `NEXT_PUBLIC_` environment variable
  or in the browser, and browser calls cannot choose a target user ID.

**Setup:** In the dedicated Vercel project `resumeaibuild` →
Settings → Environment Variables → Production, confirm:
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
from the intended Supabase project; and add **only on the server** the
matching project's `SUPABASE_SECRET_KEY` (or legacy service-role key).
After changing environment variables, deploy the latest `main` to
Production again. Do not paste keys into GitHub, this chat, or a
`NEXT_PUBLIC_` variable. The account must authenticate against this
same project.

If that server-only key is not available, the website falls back to the
owner-scoped browser Storage flow below, which requires the SQL setup
policies in the correct project. The new endpoint can create the bucket
only when the correct server key works. **Without either a functioning
server key or the bucket/RLS setup, no client-side fix can make an avatar
persist across devices.**

The prior bucket/RLS SQL remains available for projects that choose
direct browser uploads. Do not run it on another Supabase project.



**Applies only to the Supabase project configured for**
**https://resumeaibuild-virid.vercel.app**. It does not apply to SKVASRA.
The Supabase connector available during this fix points to another project,
so **the SQL was added to GitHub but not executed in that unrelated database**.

## Why the previous picture disappeared

The old frontend stored a local preview and attempted to upload
`<user-id>/avatar.jpg` to a private bucket called `profile-avatars`.
If the bucket or Storage RLS was missing, the upload failed; a local-only
image would not follow the user to another browser or device. Old signed
avatar URLs could also overwrite the newly selected picture during
background refresh. The revised code distinguishes these cases, and
verifies the uploaded image can actually be read back before reporting
**Saved to your account**.

`/images/avatar.png` is the *default placeholder* in the app's public
assets; it is NOT an upload destination and should NOT be overwritten
for each user's private photo.

## Required one-time setup (correct project only)

1. Go to the **actual ResumeBuilder** Supabase dashboard and confirm its
   project reference matches `NEXT_PUBLIC_SUPABASE_URL` for the
   `resumeaibuild` Vercel Production deployment. The account visible
   in Settings must exist in this project's Authentication → Users.
2. In that project's **SQL Editor**, open/copy the entire file
   [`supabase/profile-avatar-storage-setup.sql`](../supabase/profile-avatar-storage-setup.sql)
   and run it once. This creates/updates a PRIVATE `profile-avatars`
   bucket (JPEG only, up to 1 MB per converted image) and four RLS
   policies that permit **only** the authenticated user to access their
   `<auth.uid()>/avatar.jpg`. The script is repeatable if you run it
   again. Review any pre-existing, *other* Storage policies to ensure
   none grant broad access to this private bucket.
3. Confirm that the script's final queries list one bucket with
   `public = false` and four `rb_profile_avatar_*` policies covering
   SELECT, INSERT, UPDATE and DELETE. Supabase Storage **upsert** requires
   SELECT and UPDATE as well as INSERT. Do NOT add public access.
4. Keep `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` pointing to the same project.
   No service-role key is needed in the browser; NEVER expose one in
   a `NEXT_PUBLIC_` variable.
5. No database table is needed for avatar file metadata. Supabase Storage
   knows the private path using the authenticated user's UUID.

## Verify saving and reloading

1. Sign in to **https://resumeaibuild-virid.vercel.app/app** using the
   intended ResumeBuilder account.
2. Open **Settings → Account → Upload Profile Photo**. Choose a JPEG,
   PNG or WebP file smaller than 5 MB. The app resizes it to a 256×256
   JPEG, then uploads automatically; **Save Profile changes the name only**.
3. Confirm the **green** status: *Saved to your account*.
   Cloud upload and a subsequent authenticated download must both succeed
   before the UI reports this status.
4. Reload, sign out/in, and open the site on another phone/browser using
   the same login. The new avatar should display in Settings, the header
   and the sidebar.
5. Change the avatar again. Refresh and verify the *new* image appears,
   rather than an older cached version.
6. If the UI shows **Saved on this browser only**, click **Retry Cloud
   Sync** *after* applying the correct bucket policies. You do not need
   to choose the file again while the local copy exists. The screen
   reports a clear reason when the retry fails.

### Common errors

| Error | What to check |
| --- | --- |
| Bucket missing / not found | Run the SQL in the **correct** ResumeBuilder project; not an unrelated project |
| Row-level security / forbidden | Verify all four owner-only Storage policies. Overwriting avatars requires SELECT + INSERT + UPDATE |
| Wrong MIME / file too large | Bucket allows `image/jpeg`, limit at least 1 MB; input JPEG/PNG/WebP smaller than 5 MB |
| Invalid session / JWT | Log out and sign back in to the same project's account |
| Looks correct on one device only | If status is amber, cloud save never succeeded. Use Retry Cloud Sync |
| Old picture appears after replacement | Reload; cache-busting signed URLs are generated on photo refresh. Check cloud-sync status |
| HEIC unsupported | Export the picture as JPEG or PNG before selecting it |

## Security and operational notes

- The bucket stays private. Signed avatar URLs expire; signed URLs must
  never be stored permanently in a database or exposed as public links.
- The path is locked to the authenticated user's own UUID by Storage RLS.
- Browser local storage is a backup, not a substitute for cloud persistence;
  the UI never claims **saved to account** until cloud write AND read succeed.
- The URL `/images/avatar.png` is a static placeholder used when no
  account image is saved.
- This repository change cannot **by itself** create the Storage bucket
  in a Supabase project the assistant cannot access. Use the SQL above
  in the correct project's SQL Editor, then verify with an actual upload.
