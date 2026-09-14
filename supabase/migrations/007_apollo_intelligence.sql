-- Exact cosine search over a private, versioned embedding cache. No extra extension
-- is required; an ANN/pgvector index can replace this layer at larger scale.
create table public.apollo_embeddings (
 owner_id uuid not null references auth.users on delete cascade,
 workspace_id uuid not null references public.workspaces on delete cascade,
 context text not null check(context in ('private','shared')),
 kind text not null check(kind in ('memory','record','conversation','training','nutrition','protocol')),
 source_id uuid not null, source_version text not null check(length(source_version)<100),
 model text not null check(model='text-embedding-3-small:512:source-v1'),
 embedding double precision[] not null check(array_ndims(embedding)=1 and array_length(embedding,1)=512 and array_position(embedding,null) is null),
 created_at timestamptz not null default now(),
 primary key(owner_id,context,kind,source_id,model),
 foreign key(workspace_id,owner_id) references public.memberships(workspace_id,user_id)
);
alter table public.apollo_embeddings enable row level security;
revoke all on public.apollo_embeddings from anon,authenticated;
grant select,insert,update,delete on public.apollo_embeddings to authenticated;
create policy embeddings_read on public.apollo_embeddings for select to authenticated using(owner_id=auth.uid() and public.is_member(workspace_id));
create policy embeddings_insert on public.apollo_embeddings for insert to authenticated with check(owner_id=auth.uid() and public.is_member(workspace_id));
create policy embeddings_update on public.apollo_embeddings for update to authenticated using(owner_id=auth.uid() and public.is_member(workspace_id)) with check(owner_id=auth.uid() and public.is_member(workspace_id));
create policy embeddings_delete on public.apollo_embeddings for delete to authenticated using(owner_id=auth.uid() and public.is_member(workspace_id));
create function public.guard_apollo_embedding() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from unnest(new.embedding) x where x in ('NaN'::float8,'Infinity'::float8,'-Infinity'::float8)) or not exists(select 1 from unnest(new.embedding) x where x<>0) then raise exception 'Invalid vector';end if;
 if not exists(select 1 from public.apollo_sources(new.context,array[new.kind]) s where s.id=new.source_id and s.kind=new.kind and s.version=new.source_version) then raise exception 'Source changed or unavailable';end if;
 if TG_OP='UPDATE' and (new.owner_id<>old.owner_id or new.workspace_id<>old.workspace_id or new.context<>old.context or new.kind<>old.kind or new.source_id<>old.source_id or new.model<>old.model) then raise exception 'Embedding identity is immutable';end if;
 return new;
end;$$;
create trigger guard_apollo_embedding before insert or update on public.apollo_embeddings for each row execute function public.guard_apollo_embedding();
create function public.apollo_cosine(a double precision[],b double precision[]) returns double precision language sql immutable strict set search_path='' as $$
 select sum(x*y)/nullif(sqrt(sum(x*x))*sqrt(sum(y*y)),0) from unnest(a,b) as v(x,y);
$$;
create function public.pending_apollo_embeddings(p_context text,p_sources text[],p_model text) returns table(kind text,id uuid,title text,content text,version text,owner_id uuid,visibility text,updated_at timestamptz,pinned boolean,details jsonb)
language sql stable security invoker set search_path='' as $$
 select s.* from public.apollo_sources(p_context,p_sources) s where not exists(select 1 from public.apollo_embeddings e where e.owner_id=auth.uid() and e.context=p_context and e.kind=s.kind and e.source_id=s.id and e.source_version=s.version and e.model=p_model)
 order by s.updated_at,s.id limit 12;
$$;
create function public.apollo_index_status(p_context text,p_sources text[],p_model text) returns table(total bigint,indexed bigint)
language sql stable security invoker set search_path='' as $$
 select count(*),count(e.source_id) from public.apollo_sources(p_context,p_sources) s left join public.apollo_embeddings e on e.owner_id=auth.uid() and e.context=p_context and e.kind=s.kind and e.source_id=s.id and e.source_version=s.version and e.model=p_model;
$$;
create function public.hybrid_recall_apollo(p_query text,p_context text,p_sources text[],p_embedding double precision[],p_model text) returns table(kind text,id uuid,title text,content text,version text,owner_id uuid,visibility text,updated_at timestamptz,pinned boolean,details jsonb)
language sql stable security invoker set search_path='' as $$
 with authorized as materialized (select * from public.apollo_sources(p_context,p_sources)),
 lexical as (select l.kind,l.id,row_number() over() as rank from public.recall_apollo(p_query,p_context,p_sources,12) l),
 semantic as (select s.kind,s.id,row_number() over(order by public.apollo_cosine(e.embedding,p_embedding) desc,s.id) as rank
 from authorized s join public.apollo_embeddings e on e.owner_id=auth.uid() and e.context=p_context and e.kind=s.kind and e.source_id=s.id and e.source_version=s.version and e.model=p_model
 where array_length(p_embedding,1)=512 and public.apollo_cosine(e.embedding,p_embedding)>=0.3
 order by public.apollo_cosine(e.embedding,p_embedding) desc,s.id limit 24),
 fused as(select coalesce(l.kind,v.kind) kind,coalesce(l.id,v.id) id,coalesce(1.0/(60+l.rank),0)+coalesce(1.0/(60+v.rank),0) score from lexical l full join semantic v on l.kind=v.kind and l.id=v.id)
 select s.* from authorized s join fused f on f.kind=s.kind and f.id=s.id order by s.pinned desc,f.score desc,s.updated_at desc,s.id limit 12;
$$;
revoke all on function public.pending_apollo_embeddings(text,text[],text),public.apollo_index_status(text,text[],text),public.hybrid_recall_apollo(text,text,text[],double precision[],text) from public;
grant execute on function public.pending_apollo_embeddings(text,text[],text),public.apollo_index_status(text,text[],text),public.hybrid_recall_apollo(text,text,text[],double precision[],text) to authenticated;
-- Purge derived vectors for every account that indexed a changed source.
create function public.purge_apollo_embeddings() returns trigger language plpgsql security definer set search_path='' as $$
declare source_key uuid;
begin
 if TG_ARGV[0] in ('nutrition','protocol') then source_key=coalesce(new.entity_id,old.entity_id);else source_key=coalesce(new.id,old.id);end if;
 delete from public.apollo_embeddings where kind=TG_ARGV[0] and source_id=source_key;
 return coalesce(new,old);
end;$$;
revoke all on function public.purge_apollo_embeddings() from public;
create trigger purge_memory_vectors after update or delete on public.apollo_memories for each row execute function public.purge_apollo_embeddings('memory');
create trigger purge_record_vectors after update or delete on public.records for each row execute function public.purge_apollo_embeddings('record');
create trigger purge_training_vectors after update or delete on public.training_documents for each row execute function public.purge_apollo_embeddings('training');
create trigger purge_nutrition_vectors after insert on public.nutrition_events for each row execute function public.purge_apollo_embeddings('nutrition');
create trigger purge_protocol_vectors after insert on public.health_events for each row execute function public.purge_apollo_embeddings('protocol');
create trigger purge_turn_vectors after delete on public.apollo_turns for each row execute function public.purge_apollo_embeddings('conversation');
-- Preserve explicitly selected record connections when a conversation is reopened.
alter table public.apollo_conversations add column record_ids uuid[] not null default '{}' check(cardinality(record_ids)<=12);
create function public.guard_apollo_connections() returns trigger language plpgsql security invoker set search_path='' as $$
declare linked uuid;
begin
 foreach linked in array new.record_ids loop
  if not exists(select 1 from public.records r where r.id=linked and r.workspace_id=new.workspace_id and (new.context='private' or r.visibility='shared')) then raise exception 'Linked record is unavailable for this audience';end if;
 end loop;
 return new;
end;$$;
create trigger guard_apollo_connections before insert on public.apollo_conversations for each row execute function public.guard_apollo_connections();
