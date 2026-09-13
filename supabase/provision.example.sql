-- ADMINISTRATOR-ONLY EXAMPLE. Replace IDs with verified users from Supabase Auth.
-- Never run with these placeholders or expose privileged credentials to the app.
begin;
insert into public.workspaces (id,name)
values ('10000000-0000-4000-8000-000000000001','Legacy Juntos');
insert into public.memberships (workspace_id,user_id,display_name)
values
 ('10000000-0000-4000-8000-000000000001','REPLACE_WITH_NEIL_AUTH_UUID','Neil'),
 ('10000000-0000-4000-8000-000000000001','REPLACE_WITH_KAMILLA_AUTH_UUID','Kamilla');
commit;
