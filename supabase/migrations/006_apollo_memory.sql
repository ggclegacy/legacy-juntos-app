-- Application-owned memory. All retrieval runs as the authenticated user.
create table public.apollo_memories (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces on delete cascade,
 owner_id uuid not null references auth.users on delete cascade,
 title text not null check(length(trim(title)) between 1 and 180),
 content text not null check(length(trim(content)) between 1 and 12000),
 category text not null check(category in ('fact','preference','lesson','workflow','decision')),
 visibility text not null default 'private' check(visibility in ('private','shared','recipient')),
 recipient_id uuid references auth.users,
 status text not null default 'active' check(status in ('active','archived')),
 pinned boolean not null default false,
 effective_on date,
 source_note text not null default '' check(length(source_note)<=1000),
 source_url text not null default '' check(length(source_url)<=2000 and (source_url='' or source_url ~ '^https?://')),
 revision integer not null default 1 check(revision>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 search_document tsvector generated always as (
   to_tsvector('simple',title||' '||content||' '||source_note) ||
   to_tsvector('english',title||' '||content) || to_tsvector('portuguese',title||' '||content)
 ) stored,
 foreign key(workspace_id,owner_id) references public.memberships(workspace_id,user_id),
 foreign key(workspace_id,recipient_id) references public.memberships(workspace_id,user_id),
 check((visibility='recipient' and recipient_id is not null and recipient_id<>owner_id) or (visibility<>'recipient' and recipient_id is null))
);
create index apollo_memory_search on public.apollo_memories using gin(search_document);
create index apollo_memory_audience on public.apollo_memories(workspace_id,owner_id,visibility,updated_at desc);
alter table public.apollo_memories enable row level security;
revoke all on public.apollo_memories from anon,authenticated;
grant select,insert,update,delete on public.apollo_memories to authenticated;
create policy apollo_memory_read on public.apollo_memories for select to authenticated using(public.is_member(workspace_id) and (owner_id=auth.uid() or visibility='shared' or recipient_id=auth.uid()));
create policy apollo_memory_insert on public.apollo_memories for insert to authenticated with check(public.is_member(workspace_id) and owner_id=auth.uid());
create policy apollo_memory_update on public.apollo_memories for update to authenticated using(public.is_member(workspace_id) and owner_id=auth.uid()) with check(public.is_member(workspace_id) and owner_id=auth.uid());
create policy apollo_memory_delete on public.apollo_memories for delete to authenticated using(public.is_member(workspace_id) and owner_id=auth.uid());
create function public.guard_apollo_memory() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='INSERT' and new.revision<>1 then raise exception 'Initial revision must be one'; end if;
 if TG_OP='UPDATE' then
  if new.id<>old.id or new.owner_id<>old.owner_id or new.workspace_id<>old.workspace_id or new.created_at<>old.created_at then raise exception 'Memory identity is immutable'; end if;
  if new.revision<>old.revision+1 then raise exception 'Memory revision conflict'; end if;
 end if;
 new.updated_at=clock_timestamp();return new;
end;$$;
create trigger guard_apollo_memory before insert or update on public.apollo_memories for each row execute function public.guard_apollo_memory();
create table public.apollo_memory_versions (
 memory_id uuid not null references public.apollo_memories on delete cascade,
 revision integer not null, snapshot jsonb not null, created_at timestamptz not null default now(),
 primary key(memory_id,revision)
);
alter table public.apollo_memory_versions enable row level security;
revoke all on public.apollo_memory_versions from anon,authenticated;
grant select on public.apollo_memory_versions to authenticated;
create policy apollo_versions_owner on public.apollo_memory_versions for select to authenticated using(exists(select 1 from public.apollo_memories m where m.id=memory_id and m.owner_id=auth.uid() and public.is_member(m.workspace_id)));
create function public.version_apollo_memory() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.apollo_memory_versions(memory_id,revision,snapshot) values(new.id,new.revision,to_jsonb(new)-'search_document');
 insert into public.audit_events(actor_id,record_id,action,old_visibility,new_visibility) values(auth.uid(),new.id,'APOLLO_'||TG_OP,case when TG_OP='UPDATE' then old.visibility end,new.visibility);
 return new;
end;$$;
revoke all on function public.version_apollo_memory() from public;
create trigger version_apollo_memory after insert or update on public.apollo_memories for each row execute function public.version_apollo_memory();
create trigger audit_apollo_memory_delete after delete on public.apollo_memories for each row execute function public.audit_record();

-- A Juntos-context draft is still a private conversation. Sharing a teaching is separate.
create table public.apollo_conversations (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces on delete cascade,
 owner_id uuid not null references auth.users on delete cascade,
 title text not null check(length(trim(title)) between 1 and 180),
 context text not null check(context in ('private','shared')),
 revision integer not null default 0 check(revision>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.apollo_conversations enable row level security;
revoke all on public.apollo_conversations from anon,authenticated;
grant select,insert,delete on public.apollo_conversations to authenticated;
create policy apollo_conversation_read on public.apollo_conversations for select to authenticated using(owner_id=auth.uid() and public.is_member(workspace_id));
create policy apollo_conversation_insert on public.apollo_conversations for insert to authenticated with check(owner_id=auth.uid() and public.is_member(workspace_id) and revision=0);
create policy apollo_conversation_delete on public.apollo_conversations for delete to authenticated using(owner_id=auth.uid() and public.is_member(workspace_id));
create index apollo_conversation_owner on public.apollo_conversations(owner_id,workspace_id,updated_at desc);
create table public.apollo_turns (
 id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.apollo_conversations on delete cascade,
 ordinal integer not null check(ordinal>0), user_message text not null check(length(user_message) between 1 and 6000),
 assistant_message text not null check(length(assistant_message) between 1 and 20000),
 dependencies jsonb not null default '[]' check(jsonb_typeof(dependencies)='array' and jsonb_array_length(dependencies)<=150 and octet_length(dependencies::text)<=50000),
 created_at timestamptz not null default now(), unique(conversation_id,ordinal),
 search_document tsvector generated always as (to_tsvector('simple',user_message)||to_tsvector('english',user_message)||to_tsvector('portuguese',user_message)) stored
);
alter table public.apollo_turns enable row level security;
revoke all on public.apollo_turns from anon,authenticated;
grant select on public.apollo_turns to authenticated;
create policy apollo_turn_read on public.apollo_turns for select to authenticated using(exists(select 1 from public.apollo_conversations c where c.id=conversation_id and c.owner_id=auth.uid() and public.is_member(c.workspace_id)));
create index apollo_turn_search on public.apollo_turns using gin(search_document);
create function public.append_apollo_turn(p_conversation uuid,p_revision integer,p_user text,p_assistant text,p_dependencies jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare c public.apollo_conversations; new_id uuid;
begin
 select * into c from public.apollo_conversations where id=p_conversation and owner_id=auth.uid() and public.is_member(workspace_id) for update;
 if c.id is null or c.revision<>p_revision then raise exception 'Conversation changed. Reload before continuing.';end if;
 insert into public.apollo_turns(conversation_id,ordinal,user_message,assistant_message,dependencies) values(c.id,c.revision+1,p_user,p_assistant,p_dependencies) returning id into new_id;
 update public.apollo_conversations set revision=revision+1,updated_at=clock_timestamp() where id=c.id;
 return new_id;
end;$$;
revoke all on function public.append_apollo_turn(uuid,integer,text,text,jsonb) from public;
grant execute on function public.append_apollo_turn(uuid,integer,text,text,jsonb) to authenticated;

-- Natural text, not executable SQL or tsquery syntax. OR terms improves conversational recall.
create function public.apollo_query(q text) returns tsquery language sql immutable set search_path='' as $$
 select replace((plainto_tsquery('simple',left(q,6000)) || plainto_tsquery('english',left(q,6000)) || plainto_tsquery('portuguese',left(q,6000)))::text,' & ',' | ')::tsquery;
$$;
-- One authorization-preserving source surface for both retrieval and revision validation.
create function public.apollo_sources(p_context text,p_sources text[]) returns table(
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
 where 'protocol'=any(p_sources) and p_context='private';
$$;
revoke all on function public.apollo_sources(text,text[]) from public;
grant execute on function public.apollo_sources(text,text[]) to authenticated;
create function public.recall_apollo(p_query text,p_context text,p_sources text[],p_limit integer default 12) returns table(
 kind text,id uuid,title text,content text,version text,owner_id uuid,visibility text,updated_at timestamptz,pinned boolean,details jsonb
) language sql stable security invoker set search_path='' as $$
 select s.* from public.apollo_sources(p_context,p_sources) s
 where s.pinned or (to_tsvector('simple',s.title||' '||s.content)||to_tsvector('english',s.title||' '||s.content)||to_tsvector('portuguese',s.title||' '||s.content)) @@ public.apollo_query(p_query)
 order by s.pinned desc,ts_rank_cd(to_tsvector('simple',s.title||' '||s.content)||to_tsvector('english',s.title||' '||s.content)||to_tsvector('portuguese',s.title||' '||s.content),public.apollo_query(p_query)) desc,s.updated_at desc,s.id
 limit greatest(1,least(p_limit,12));
$$;
create function public.check_apollo_sources(p_context text,p_keys jsonb) returns table(kind text,id uuid,version text)
language sql stable security invoker set search_path='' as $$
 select s.kind,s.id,s.version from public.apollo_sources(p_context,array['memory','record','conversation','training','nutrition','protocol']) s
 join jsonb_to_recordset(p_keys) as k(kind text,id uuid,version text) on s.kind=k.kind and s.id=k.id and s.version=k.version;
$$;
revoke all on function public.recall_apollo(text,text,text[],integer),public.check_apollo_sources(text,jsonb) from public;
grant execute on function public.recall_apollo(text,text,text[],integer),public.check_apollo_sources(text,jsonb) to authenticated;
