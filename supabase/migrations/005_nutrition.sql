-- Append-only nutrition history. No partner/shared access and no browser updates.
create table public.nutrition_events (
 id uuid primary key,
 entity_id uuid not null,
 owner_id uuid not null references auth.users on delete cascade,
 workspace_id uuid not null references public.workspaces on delete cascade,
 revision integer not null check(revision>0),
 payload jsonb not null check(jsonb_typeof(payload)='object' and payload ? 'kind' and payload->>'kind' in ('meal','recipe','targets','day','food') and octet_length(payload::text)<200000),
 created_at timestamptz not null default now(),
 unique(owner_id,workspace_id,entity_id,revision)
);
alter table public.nutrition_events enable row level security;
create policy nutrition_read on public.nutrition_events for select to authenticated using(owner_id=auth.uid() and public.is_member(workspace_id));
create policy nutrition_write on public.nutrition_events for insert to authenticated with check(owner_id=auth.uid() and public.is_member(workspace_id));
revoke all on public.nutrition_events from anon,authenticated;
grant select,insert on public.nutrition_events to authenticated;
create index nutrition_owner on public.nutrition_events(owner_id,workspace_id,id);
create function public.guard_nutrition_event() returns trigger language plpgsql set search_path='' as $$
declare previous public.nutrition_events;
begin
 select * into previous from public.nutrition_events where owner_id=new.owner_id and workspace_id=new.workspace_id and entity_id=new.entity_id order by revision desc limit 1;
 if previous.id is null then
  if new.revision<>1 then raise exception 'Initial revision must be one'; end if;
 else
  if new.revision<>previous.revision+1 or new.payload->>'kind'<>previous.payload->>'kind' then raise exception 'Nutrition revision conflict'; end if;
 end if;
 if previous.id is not null and new.payload->>'kind'='day' and new.payload->>'date' is distinct from previous.payload->>'date' then raise exception 'Day date cannot change'; end if;
 new.created_at=now(); return new;
end;$$;
create trigger guard_nutrition_event before insert on public.nutrition_events for each row execute function public.guard_nutrition_event();

create unique index nutrition_day_identity on public.nutrition_events(owner_id,workspace_id,(payload->>'date')) where payload->>'kind'='day' and revision=1;
