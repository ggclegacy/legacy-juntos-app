-- Supabase Storage dependency. Files remain private and download-only in this release.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('health-reports','health-reports',false,5242880,array['application/pdf','image/png','image/jpeg'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy health_report_read on storage.objects for select to authenticated using(bucket_id='health-reports' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.memberships where user_id=auth.uid() and active));
create policy health_report_insert on storage.objects for insert to authenticated with check(bucket_id='health-reports' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.memberships where user_id=auth.uid() and active));
