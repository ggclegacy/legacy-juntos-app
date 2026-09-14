-- Reviewed documents with source-aware passages. No provider-owned vector store.
create table public.apollo_documents (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces on delete cascade,
 owner_id uuid not null references auth.users on delete cascade,
 title text not null check(length(trim(title)) between 1 and 180),
 content text not null check(length(trim(content)) between 1 and 60000),
 topic text not null check(topic in ('training','nutrition','wellness','faith','communication','business','creativity')),
 origin text not null check(origin in ('personal_note','coach_document','published_reference','research_draft')),
 visibility text not null default 'private' check(visibility in ('private','shared','recipient')),
 recipient_id uuid references auth.users,
 status text not null default 'draft' check(status in ('draft','active','archived')),
 "references" jsonb not null default '[]' check(jsonb_typeof("references")='array' and jsonb_array_length("references")<=20 and octet_length("references"::text)<=48000),
 source_name text not null default '' check(length(source_name)<=240),
 published_on date, review_on date, reviewed_at timestamptz,
 notes text not null default '' check(length(notes)<=2000),
 revision integer not null default 1 check(revision>0),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(workspace_id,owner_id) references public.memberships(workspace_id,user_id),
 foreign key(workspace_id,recipient_id) references public.memberships(workspace_id,user_id),
 check((visibility='recipient' and recipient_id is not null and recipient_id<>owner_id) or (visibility<>'recipient' and recipient_id is null))
);
alter table public.apollo_documents enable row level security;
revoke all on public.apollo_documents from anon,authenticated;
grant select,insert,update,delete on public.apollo_documents to authenticated;
create policy documents_read on public.apollo_documents for select to authenticated using(public.is_member(workspace_id) and (owner_id=auth.uid() or (status='active' and (visibility='shared' or recipient_id=auth.uid()))));
create policy documents_insert on public.apollo_documents for insert to authenticated with check(public.is_member(workspace_id) and owner_id=auth.uid());
create policy documents_update on public.apollo_documents for update to authenticated using(public.is_member(workspace_id) and owner_id=auth.uid()) with check(public.is_member(workspace_id) and owner_id=auth.uid());
create policy documents_delete on public.apollo_documents for delete to authenticated using(public.is_member(workspace_id) and owner_id=auth.uid());
create index apollo_documents_library on public.apollo_documents(workspace_id,topic,status,updated_at desc);
create function public.guard_apollo_document() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='INSERT' and new.revision<>1 then raise exception 'Initial revision must be one';end if;
 if TG_OP='UPDATE' then
  if new.id<>old.id or new.owner_id<>old.owner_id or new.workspace_id<>old.workspace_id or new.created_at<>old.created_at then raise exception 'Document identity is immutable';end if;
  if new.revision<>old.revision+1 then raise exception 'Document revision conflict';end if;
 end if;
 if exists(select 1 from jsonb_array_elements(new."references") r where jsonb_typeof(r)<>'object' or coalesce(r->>'url','') !~ '^https?://' or length(coalesce(r->>'url',''))>2000 or length(coalesce(r->>'title','')) not between 1 and 300) then raise exception 'Invalid source reference';end if;
 new.updated_at=clock_timestamp();new.reviewed_at=case when new.status='active' then new.updated_at else null end;
 return new;
end;$$;
create trigger guard_apollo_document before insert or update on public.apollo_documents for each row execute function public.guard_apollo_document();
create table public.apollo_document_versions (
 document_id uuid not null references public.apollo_documents on delete cascade,revision integer not null,snapshot jsonb not null,created_at timestamptz not null default now(),primary key(document_id,revision)
);
alter table public.apollo_document_versions enable row level security;
revoke all on public.apollo_document_versions from anon,authenticated;grant select on public.apollo_document_versions to authenticated;
create policy document_versions_read on public.apollo_document_versions for select to authenticated using(exists(select 1 from public.apollo_documents d where d.id=document_id and d.owner_id=auth.uid() and public.is_member(d.workspace_id)));
create table public.apollo_passages (
 id uuid primary key default gen_random_uuid(),document_id uuid not null references public.apollo_documents on delete cascade,
 ordinal integer not null check(ordinal>0),start_character integer not null check(start_character>0),content text not null check(length(content) between 1 and 1600),unique(document_id,ordinal)
);
alter table public.apollo_passages enable row level security;
revoke all on public.apollo_passages from anon,authenticated;grant select on public.apollo_passages to authenticated;
create policy passages_read on public.apollo_passages for select to authenticated using(exists(select 1 from public.apollo_documents d where d.id=document_id and d.status='active' and public.is_member(d.workspace_id)));
create trigger purge_knowledge_vectors after delete on public.apollo_passages for each row execute function public.purge_apollo_embeddings('knowledge');
create function public.refresh_apollo_document() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.apollo_document_versions(document_id,revision,snapshot) values(new.id,new.revision,to_jsonb(new));
 delete from public.apollo_passages where document_id=new.id;
 if new.status='active' then
  insert into public.apollo_passages(document_id,ordinal,start_character,content)
  select new.id,((pos-1)/1400)+1,pos,substring(new.content from pos for 1600) from generate_series(1,length(new.content),1400) pos;
 end if;
 insert into public.audit_events(actor_id,record_id,action,old_visibility,new_visibility) values(auth.uid(),new.id,'KNOWLEDGE_'||TG_OP,case when TG_OP='UPDATE' then old.visibility end,new.visibility);
 return new;
end;$$;
revoke all on function public.refresh_apollo_document() from public;
create trigger refresh_apollo_document after insert or update on public.apollo_documents for each row execute function public.refresh_apollo_document();
create trigger audit_apollo_document_delete after delete on public.apollo_documents for each row execute function public.audit_record();
alter table public.apollo_embeddings drop constraint apollo_embeddings_kind_check;
alter table public.apollo_embeddings add constraint apollo_embeddings_kind_check check(kind in ('memory','record','conversation','training','nutrition','protocol','knowledge'));

create or replace function public.apollo_sources(p_context text,p_sources text[]) returns table(
 kind text,id uuid,title text,content text,version text,owner_id uuid,visibility text,updated_at timestamptz,pinned boolean,details jsonb
) language sql stable security invoker set search_path='' as $$
 select 'memory',m.id,m.title,m.content,m.revision::text,m.owner_id,m.visibility,m.updated_at,m.pinned,
 jsonb_build_object('category',m.category,'effective_on',m.effective_on,'source_note',m.source_note,'source_url',m.source_url,'origin','explicit user teaching')
 from public.apollo_memories m where 'memory'=any(p_sources) and m.status='active' and public.is_member(m.workspace_id) and (p_context='private' or (p_context='shared' and m.visibility='shared'))
 union all
 select 'record',r.id,r.title,left(r.body||E'\n'||r.metadata::text,12000),(to_jsonb(r.updated_at)#>>'{}'),r.owner_id,r.visibility,r.updated_at,false,jsonb_build_object('domain',r.domain,'status',r.status,'excerpt',true)
 from public.records r where 'record'=any(p_sources) and public.is_member(r.workspace_id) and (p_context='private' or (p_context='shared' and r.visibility='shared'))
 union all
 select 'conversation',t.id,c.title,t.user_message,(to_jsonb(t.created_at)#>>'{}'),c.owner_id,'private',t.created_at,false,jsonb_build_object('origin','past user statement','conversation_id',c.id)
 from public.apollo_turns t join public.apollo_conversations c on c.id=t.conversation_id
 where 'conversation'=any(p_sources) and c.owner_id=auth.uid() and public.is_member(c.workspace_id) and c.context=p_context
 union all
 select 'training',d.id,coalesce(d.payload->>'name',d.payload->>'kind','Training'),left(d.payload::text,12000),d.revision::text,d.owner_id,'private',d.updated_at,false,jsonb_build_object('excerpt',true)
 from public.training_documents d where 'training'=any(p_sources) and p_context='private' and d.owner_id=auth.uid() and public.is_member(d.workspace_id)
 union all
 select 'nutrition',e.entity_id,coalesce(e.payload->>'name',e.payload->>'kind','Nutrition'),left(e.payload::text,12000),e.revision::text,e.owner_id,'private',e.created_at,false,jsonb_build_object('excerpt',true)
 from (select distinct on (owner_id,workspace_id,entity_id) * from public.nutrition_events where owner_id=auth.uid() and public.is_member(workspace_id) order by owner_id,workspace_id,entity_id,revision desc) e
 where 'nutrition'=any(p_sources) and p_context='private' and coalesce(e.payload->>'state','')<>'removed'
 union all
 select 'protocol',e.entity_id,coalesce(e.payload->>'name',e.payload->>'kind','Protocol'),left(e.payload::text,12000),e.revision::text,e.owner_id,'private',e.created_at,false,jsonb_build_object('excerpt',true,'origin','user-entered health data; not verified clinical evidence')
 from (select distinct on (owner_id,workspace_id,entity_id) * from public.health_events where owner_id=auth.uid() and public.is_member(workspace_id) order by owner_id,workspace_id,entity_id,revision desc) e
 where 'protocol'=any(p_sources) and p_context='private'
 union all
 select 'knowledge',p.id,d.title||' · passage '||p.ordinal,p.content,d.revision::text,d.owner_id,d.visibility,d.updated_at,false,
 jsonb_build_object('document_id',d.id,'passage',p.ordinal,'start_character',p.start_character,'category',d.topic,'origin',d.origin,'source_name',d.source_name,'references',d."references",'published_on',d.published_on,'review_on',d.review_on,'reviewed_at',d.reviewed_at,'excerpt',true,'document_notes',d.notes)
 from public.apollo_passages p join public.apollo_documents d on d.id=p.document_id
 where 'knowledge'=any(p_sources) and d.status='active' and public.is_member(d.workspace_id) and (p_context='private' or (p_context='shared' and d.visibility='shared'));
$$;

create or replace function public.check_apollo_sources(p_context text,p_keys jsonb) returns table(kind text,id uuid,version text)
language sql stable security invoker set search_path='' as $$
 select s.kind,s.id,s.version from public.apollo_sources(p_context,array['memory','record','conversation','training','nutrition','protocol','knowledge']) s
 join jsonb_to_recordset(p_keys) as k(kind text,id uuid,version text) on s.kind=k.kind and s.id=k.id and s.version=k.version;
$$;
