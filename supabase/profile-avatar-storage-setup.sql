-- ONE-TIME SETUP. RUN ONLY IN THE DEDICATED RESUMEBUILDER SUPABASE PROJECT.
-- Do not execute against SKVASRA, any shared Supabase project, or production
-- databases that are not backing https://resumeaibuild-virid.vercel.app.
--
-- Store resized 256x256 JPEGs. Private bucket; no anonymous reads.
-- The client writes only <auth.uid()>/avatar.jpg. No service_role on clients.

begin;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('profile-avatars','profile-avatars',false,1048576,array['image/jpeg']::text[])
on conflict (id) do update set
 public=false,
 file_size_limit=1048576,
 allowed_mime_types=array['image/jpeg']::text[];

-- Replacing exactly these app-specific policies makes setup repeatable.
-- Other policies, if any, should be independently audited for permissions.
drop policy if exists "rb_profile_avatar_read" on storage.objects;
drop policy if exists "rb_profile_avatar_insert" on storage.objects;
drop policy if exists "rb_profile_avatar_update" on storage.objects;
drop policy if exists "rb_profile_avatar_delete" on storage.objects;

create policy "rb_profile_avatar_read"
 on storage.objects for select to authenticated
 using (bucket_id='profile-avatars'
  and name=(select auth.uid())::text || '/avatar.jpg');

create policy "rb_profile_avatar_insert"
 on storage.objects for insert to authenticated
 with check (bucket_id='profile-avatars'
  and name=(select auth.uid())::text || '/avatar.jpg');

create policy "rb_profile_avatar_update"
 on storage.objects for update to authenticated
 using (bucket_id='profile-avatars'
  and name=(select auth.uid())::text || '/avatar.jpg')
 with check (bucket_id='profile-avatars'
  and name=(select auth.uid())::text || '/avatar.jpg');

create policy "rb_profile_avatar_delete"
 on storage.objects for delete to authenticated
 using (bucket_id='profile-avatars'
  and name=(select auth.uid())::text || '/avatar.jpg');

commit;

-- Read-only check after setup:
select id,name,public,file_size_limit,allowed_mime_types
 from storage.buckets where id='profile-avatars';
select policyname,cmd,roles,qual,with_check
 from pg_policies
 where schemaname='storage' and tablename='objects'
 and policyname like 'rb_profile_avatar_%'
 order by policyname;
