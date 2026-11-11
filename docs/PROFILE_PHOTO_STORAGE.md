# ResumeBuilder profile photos: private Storage setup

**Use only the Supabase project used by `https://resumeaibuild-virid.vercel.app`.**
Never run these changes on SKVASRA or a different Supabase/Vercel project.

## One-time storage setup

Create a bucket in Supabase → Storage:

- Name: `profile-avatars`
- Public: **No** (private)
- Allowed MIME types: `image/jpeg`
- Maximum file size: 1 MB

The app crops the uploaded photo to 256×256 JPEG and saves it to `<current-auth-user-id>/avatar.jpg`. Signed-in users can read their picture using a short-lived signed URL. The account owner must be the only one allowed to change it.

In **only the ResumeBuilder Supabase project's** SQL Editor, add these policies (if their names do not already exist):

```sql
create policy "rb_profile_avatar_read" on storage.objects
for select to authenticated
using (
  bucket_id = 'profile-avatars'
  and name = (select auth.uid())::text || '/avatar.jpg'
);

create policy "rb_profile_avatar_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'profile-avatars'
  and name = (select auth.uid())::text || '/avatar.jpg'
);

create policy "rb_profile_avatar_update" on storage.objects
for update to authenticated
using (
  bucket_id = 'profile-avatars'
  and name = (select auth.uid())::text || '/avatar.jpg'
)
with check (
  bucket_id = 'profile-avatars'
  and name = (select auth.uid())::text || '/avatar.jpg'
);

create policy "rb_profile_avatar_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'profile-avatars'
  and name = (select auth.uid())::text || '/avatar.jpg'
);
```

Ensure Storage access controls / RLS are enabled. Do not add permissive public policies. Do not use the Supabase service role key in browser code.

## Verification

Sign in with a test account. Settings → Account → Upload Profile Photo. When the upload is accepted, the app must explicitly say **"Profile photo saved to your account"**. Then refresh, sign out and sign in, and try another browser/phone with the same account. Avatar should persist via a signed URL. If the bucket is missing or permissions are incorrect, the app will say **cloud sync failed** and only show the browser's temporary/local copy. Do not claim cross-device upload succeeded if it did not.

Use Supabase Storage logs to diagnose storage failure. This repo only includes code/policy instructions; it does not create the bucket in a different connected project.
