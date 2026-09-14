-- Append-only health history. No partner/shared access and no browser updates.
create table public.health_events (
 id uuid primary key,
 entity_id uuid not null,
 owner_id uuid not null references auth.users on delete cascade,
 workspace_id uuid not null references public.workspaces on delete cascade,
 revision integer not null check(revision>0),
 payload jsonb not null check(jsonb_typeof(payload)='object' and payload->>'kind' in ('protocol','lab','dose','checkin') and octet_length(payload::text)<32000),
 created_at timestamptz not null default now(),
 unique(owner_id,workspace_id,entity_id,revision)
);
alter table public.health_events enable row level security;
create policy health_read on public.health_events for select to authenticated using(owner_id=auth.uid() and public.is_member(workspace_id));
create policy health_write on public.health_events for insert to authenticated with check(owner_id=auth.uid() and public.is_member(workspace_id));
revoke all on public.health_events from anon,authenticated;
grant select,insert on public.health_events to authenticated;
create index health_owner on public.health_events(owner_id,workspace_id,id);
create function public.guard_health_event() returns trigger language plpgsql set search_path='' as $$
declare previous public.health_events;
begin
 select * into previous from public.health_events where owner_id=new.owner_id and workspace_id=new.workspace_id and entity_id=new.entity_id order by revision desc limit 1;
 if previous.id is null then
  if new.revision<>1 then raise exception 'Initial revision must be one'; end if;
 else
  if new.revision<>previous.revision+1 or new.payload->>'kind'<>previous.payload->>'kind' then raise exception 'Health revision conflict'; end if;
 end if;
 new.created_at=now(); return new;
end;$$;
create trigger guard_health_event before insert on public.health_events for each row execute function public.guard_health_event();
