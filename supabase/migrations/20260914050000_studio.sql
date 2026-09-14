-- Studio extends existing memberships/RLS. Apply after the existing numbered migrations with a privileged migration connection.
create table public.studio_entries (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces,
 owner_id uuid not null references auth.users, kind text not null check(kind in ('brand','campaign','content','idea','asset','reference','template','deliverable','insight')),
 title text not null check(length(trim(title)) between 1 and 180), body text not null default '' check(length(body)<=12000),
 visibility text not null default 'private' check(visibility in ('private','recipient','shared')), recipient_id uuid,
 context text not null default 'personal' check(context in ('personal','juntos','brand','project')),
 brand_id uuid references public.studio_entries on delete restrict, campaign_id uuid references public.studio_entries on delete restrict, parent_id uuid references public.studio_entries on delete restrict,
 status text not null default 'draft' check(status in ('idea','draft','review','approved','scheduled','published','archived')),
 due_at timestamptz, details jsonb not null default '{}' check(jsonb_typeof(details)='object' and octet_length(details::text)<=64000),
 revision integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(workspace_id,owner_id) references public.memberships(workspace_id,user_id),
 foreign key(workspace_id,recipient_id) references public.memberships(workspace_id,user_id),
 check((visibility='recipient' and recipient_id is not null and recipient_id<>owner_id) or (visibility<>'recipient' and recipient_id is null))
);
create index studio_entries_scope on public.studio_entries(workspace_id,kind,created_at desc);
create index studio_entries_campaign on public.studio_entries(campaign_id);
create index studio_entries_calendar on public.studio_entries(workspace_id,due_at);
create function public.studio_read(e uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.studio_entries where id=e and public.is_member(workspace_id) and (owner_id=auth.uid() or visibility='shared' or recipient_id=auth.uid()));
$$;
create function public.studio_own(e uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.studio_entries where id=e and public.is_member(workspace_id) and owner_id=auth.uid());
$$;
revoke all on function public.studio_read(uuid),public.studio_own(uuid) from public;
grant execute on function public.studio_read(uuid),public.studio_own(uuid) to authenticated;
create function public.studio_guard_entry() returns trigger language plpgsql security definer set search_path='' as $$
declare p public.studio_entries; linked uuid; assignee text;
begin
 if TG_OP='UPDATE' then
  if row(new.id,new.workspace_id,new.owner_id,new.kind,new.visibility,new.recipient_id,new.context,new.brand_id,new.campaign_id,new.parent_id,new.created_at) is distinct from row(old.id,old.workspace_id,old.owner_id,old.kind,old.visibility,old.recipient_id,old.context,old.brand_id,old.campaign_id,old.parent_id,old.created_at) then raise exception 'Identity, links and audience are immutable'; end if;
  new.revision=old.revision+1;
 else new.revision=1; end if;
 if new.kind='reference' and new.details->>'reference_type'='person' and new.visibility<>'private' then raise exception 'Likeness references stay private'; end if;
 if new.details->>'source_kind'='performance_extract' and new.details->>'source_consent' is distinct from 'true' then raise exception 'Explicit extract consent required'; end if;
 if new.recipient_id is not null and not exists(select 1 from public.memberships where workspace_id=new.workspace_id and user_id=new.recipient_id and active) then raise exception 'Recipient unavailable'; end if;
 if new.details ? 'assignees' then
  if jsonb_typeof(new.details->'assignees')<>'array' then raise exception 'Invalid assignees'; end if;
  for assignee in select jsonb_array_elements_text(new.details->'assignees') loop
   if not exists(select 1 from public.memberships where workspace_id=new.workspace_id and user_id::text=assignee and active and (new.visibility='shared' or user_id=new.owner_id or user_id=new.recipient_id)) then raise exception 'Assignee outside audience'; end if;
  end loop;
 end if;
 foreach linked in array array[new.brand_id,new.campaign_id,new.parent_id] loop
  if linked is not null then
   select * into p from public.studio_entries where id=linked;
   if not found or p.workspace_id<>new.workspace_id or p.id=new.id then raise exception 'Linked entry unavailable'; end if;
   if p.visibility<>'shared' and (new.visibility='shared' or new.owner_id not in (p.owner_id,coalesce(p.recipient_id,p.owner_id)) or (new.recipient_id is not null and new.recipient_id not in (p.owner_id,coalesce(p.recipient_id,p.owner_id)))) then raise exception 'Linked audience mismatch'; end if;
   if linked=new.brand_id and p.kind<>'brand' then raise exception 'Brand link required'; end if;
   if linked=new.campaign_id and p.kind<>'campaign' then raise exception 'Campaign link required'; end if;
  end if;
 end loop;
 new.updated_at=now();return new;
end;$$;
revoke all on function public.studio_guard_entry() from public;
create trigger studio_guard_entry before insert or update on public.studio_entries for each row execute function public.studio_guard_entry();
alter table public.studio_entries enable row level security;
revoke all on public.studio_entries from anon,authenticated;
grant select,insert,update,delete on public.studio_entries to authenticated;
create policy studio_entry_read on public.studio_entries for select to authenticated using(public.is_member(workspace_id) and (owner_id=auth.uid() or visibility='shared' or recipient_id=auth.uid()));
create policy studio_entry_insert on public.studio_entries for insert to authenticated with check(public.is_member(workspace_id) and owner_id=auth.uid());
create policy studio_entry_update on public.studio_entries for update to authenticated using(public.studio_own(id)) with check(public.studio_own(id));
create policy studio_entry_delete on public.studio_entries for delete to authenticated using(public.studio_own(id));

create table public.studio_versions (
 id uuid primary key default gen_random_uuid(), entry_id uuid not null references public.studio_entries on delete restrict,
 parent_version_id uuid references public.studio_versions on delete restrict,
 object_key text unique, text_content text not null default '' check(length(text_content)<=30000),
 mime_type text not null, byte_size bigint not null default 0 check(byte_size between 0 and 104857600),
 provenance text not null check(provenance in ('uploaded','generated','edited')), provider text, model text,
 usage jsonb not null default '{}' check(octet_length(usage::text)<=8000), is_original boolean not null default true,
 created_at timestamptz not null default now(), check(object_key is not null or length(text_content)>0)
);
create function public.studio_guard_version() returns trigger language plpgsql security definer set search_path='' as $$
declare e public.studio_entries;
begin
 select * into e from public.studio_entries where id=new.entry_id;
 if e.kind not in ('asset','reference','content') then raise exception 'Media requires asset, reference or content'; end if;
 if new.object_key is not null and new.object_key<>e.workspace_id::text||'/'||e.owner_id::text||'/'||e.id::text||'/'||new.id::text then raise exception 'Invalid object path'; end if;
 if new.parent_version_id is not null and not exists(select 1 from public.studio_versions where id=new.parent_version_id and entry_id=new.entry_id) then raise exception 'Version lineage mismatch'; end if;
 return new;
end;$$;
revoke all on function public.studio_guard_version() from public;
create trigger studio_guard_version before insert on public.studio_versions for each row execute function public.studio_guard_version();
alter table public.studio_versions enable row level security;
revoke all on public.studio_versions from anon,authenticated;
grant select on public.studio_versions to authenticated;
grant insert(id,entry_id,parent_version_id,object_key,text_content,mime_type,byte_size,provenance,is_original) on public.studio_versions to authenticated;
create policy studio_version_read on public.studio_versions for select to authenticated using(public.studio_read(entry_id));
create policy studio_version_insert on public.studio_versions for insert to authenticated with check(public.studio_own(entry_id) and provenance in ('uploaded','edited'));

create table public.studio_reviews (
 id uuid primary key default gen_random_uuid(), entry_id uuid not null references public.studio_entries on delete restrict,
 version_id uuid references public.studio_versions on delete restrict, author_id uuid not null default auth.uid() references auth.users,
 decision text not null check(decision in ('comment','approved','revision_requested')), body text not null check(length(body)<=6000), created_at timestamptz not null default now()
);
create function public.studio_guard_review() returns trigger language plpgsql set search_path='' as $$
begin
 if new.version_id is not null and not exists(select 1 from public.studio_versions where id=new.version_id and entry_id=new.entry_id) then raise exception 'Review version mismatch';end if;return new;
end;$$;
create trigger studio_guard_review before insert on public.studio_reviews for each row execute function public.studio_guard_review();
alter table public.studio_reviews enable row level security;
revoke all on public.studio_reviews from anon,authenticated;
grant select on public.studio_reviews to authenticated;
grant insert(entry_id,version_id,decision,body) on public.studio_reviews to authenticated;
create policy studio_review_read on public.studio_reviews for select to authenticated using(public.studio_read(entry_id));
create policy studio_review_insert on public.studio_reviews for insert to authenticated with check(public.studio_read(entry_id) and author_id=auth.uid());

create table public.studio_jobs (
 id uuid primary key default gen_random_uuid(), entry_id uuid not null references public.studio_entries on delete restrict,
 owner_id uuid not null default auth.uid() references auth.users, request jsonb not null check(jsonb_typeof(request)='object' and octet_length(request::text)<=14000),
 provider text not null, model text not null,
 state text not null default 'queued' check(state in ('queued','running','waiting','retry','succeeded','failed','needs_attention','cancelled')),
 provider_task_id text, attempts integer not null default 0, poll_count integer not null default 0, next_attempt_at timestamptz not null default now(),
 lease_until timestamptz, lease_token uuid, error text, usage jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index studio_jobs_due on public.studio_jobs(state,next_attempt_at);
alter table public.studio_jobs enable row level security;
revoke all on public.studio_jobs from anon,authenticated;
grant select on public.studio_jobs to authenticated;
grant insert(id,entry_id,request,provider,model) on public.studio_jobs to authenticated;
create policy studio_job_read on public.studio_jobs for select to authenticated using(owner_id=auth.uid() and public.studio_own(entry_id));
create policy studio_job_insert on public.studio_jobs for insert to authenticated with check(owner_id=auth.uid() and public.studio_own(entry_id) and request->>'provider_consent'='true' and request->>'entry_id'=entry_id::text);
create function public.studio_job_quota() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtext(new.owner_id::text));
 if (select count(*) from public.studio_jobs where owner_id=new.owner_id and created_at>now()-interval '1 hour')>=20 then raise exception 'Studio hourly job limit reached'; end if;
 return new;
end;$$;
create trigger studio_job_quota before insert on public.studio_jobs for each row execute function public.studio_job_quota();
revoke all on function public.studio_job_quota() from public;
-- Only the dedicated worker may claim/update jobs. Unknown submission outcomes never re-submit automatically.
create function public.studio_claim_job() returns setof public.studio_jobs language plpgsql security definer set search_path='' as $$
begin
 update public.studio_jobs set state=case when provider_task_id is null then 'needs_attention' else 'waiting' end,error='Worker interrupted. Submission requires reconciliation if no receipt is available.',lease_until=null,lease_token=null where state='running' and lease_until<now();
 return query with candidate as (
  select id from public.studio_jobs where state in ('queued','retry','waiting') and next_attempt_at<=now() order by next_attempt_at for update skip locked limit 1
 ) update public.studio_jobs j set state='running',lease_until=now()+interval '5 minutes',lease_token=gen_random_uuid(),attempts=attempts+case when provider_task_id is null then 1 else 0 end,poll_count=poll_count+case when provider_task_id is null then 0 else 1 end,updated_at=now() from candidate c where j.id=c.id returning j.*;
end;$$;
revoke all on function public.studio_claim_job() from public,anon,authenticated;
grant execute on function public.studio_claim_job() to service_role;

create table public.studio_activity (
 id bigint generated always as identity primary key, actor_id uuid, entry_id uuid not null, action text not null, created_at timestamptz not null default now()
);
create function public.studio_audit() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.studio_activity(actor_id,entry_id,action) values(auth.uid(),coalesce(new.id,old.id),TG_OP); return coalesce(new,old);end;$$;
revoke all on function public.studio_audit() from public;
create trigger studio_audit after insert or update or delete on public.studio_entries for each row execute function public.studio_audit();
alter table public.studio_activity enable row level security;
revoke all on public.studio_activity from anon,authenticated;
grant select on public.studio_activity to authenticated;
create policy studio_activity_read on public.studio_activity for select to authenticated using(actor_id=auth.uid() and public.studio_read(entry_id));

-- Connector tokens belong in an encrypted secret store, never these display records.
create table public.studio_social_connections (
 id uuid primary key default gen_random_uuid(), entry_id uuid not null references public.studio_entries, platform text not null,
 account_label text not null, external_account_id text not null, scopes text[] not null default '{}', state text not null default 'disconnected', created_at timestamptz not null default now()
);
create table public.studio_publish_jobs (
 id uuid primary key default gen_random_uuid(), entry_id uuid not null references public.studio_entries, version_id uuid not null references public.studio_versions,
 connection_id uuid not null references public.studio_social_connections, scheduled_at timestamptz not null, state text not null default 'blocked',
 attempts integer not null default 0, error text, provider_receipt text, created_at timestamptz not null default now()
);
create table public.studio_publications (
 id uuid primary key default gen_random_uuid(), entry_id uuid not null references public.studio_entries, publish_job_id uuid references public.studio_publish_jobs,
 platform text not null, external_id text not null, url text not null, published_at timestamptz not null, unique(platform,external_id)
);
create table public.studio_metrics (
 id uuid primary key default gen_random_uuid(), entry_id uuid not null references public.studio_entries, platform text not null,
 metric text not null check(metric in ('views','impressions','reach','watch_seconds','saves','shares','comments','clicks','followers','conversions')),
 value numeric not null check(value>=0), period_start date not null, period_end date not null, source text not null default 'manual' check(source in ('manual','api')),
 observed_at timestamptz not null default now(), check(period_end>=period_start)
);
do $$ declare t text;begin
 foreach t in array array['studio_social_connections','studio_publish_jobs','studio_publications','studio_metrics'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy read_parent on public.%I for select to authenticated using(public.studio_read(entry_id))',t);
 end loop;
end;$$;
grant insert(entry_id,platform,metric,value,period_start,period_end) on public.studio_metrics to authenticated;
create policy studio_metrics_manual on public.studio_metrics for insert to authenticated with check(public.studio_own(entry_id) and source='manual');
-- Service worker needs explicit grants in non-default-grant installations.
grant all on public.studio_entries,public.studio_versions,public.studio_jobs to service_role;

-- Supabase storage. Tests create this schema to exercise policies too.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('studio-media','studio-media',false,104857600,array['image/png','image/jpeg','image/webp','video/mp4','audio/mpeg','audio/wav','application/pdf']) on conflict(id) do nothing;
create policy studio_media_read on storage.objects for select to authenticated using(bucket_id='studio-media' and exists(select 1 from public.studio_versions v where v.object_key=name and public.studio_read(v.entry_id)));
create policy studio_media_insert on storage.objects for insert to authenticated with check(bucket_id='studio-media' and exists(select 1 from public.studio_versions v where v.object_key=name and public.studio_own(v.entry_id) and v.provenance in ('uploaded','edited')));

-- A new original/derivative invalidates entry-level readiness; version reviews stay immutable.
create function public.studio_version_draft() returns trigger language plpgsql security definer set search_path='' as $$
begin update public.studio_entries set status='draft' where id=new.entry_id and status in ('approved','scheduled','published');return new;end;$$;
revoke all on function public.studio_version_draft() from public;
create trigger studio_version_draft after insert on public.studio_versions for each row execute function public.studio_version_draft();
