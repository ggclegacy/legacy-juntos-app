-- Apply through a privileged migration connection. Never expose this role to the app.
create table public.workspaces (id uuid primary key default gen_random_uuid(), name text not null);
create table public.memberships (
 workspace_id uuid not null references public.workspaces on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 active boolean not null default true,
 display_name text not null check (length(display_name) between 1 and 80),
 primary key(workspace_id,user_id), unique(user_id)
);
create function public.is_member(w uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.memberships where workspace_id=w and user_id=auth.uid() and active);
$$;
revoke all on function public.is_member(uuid) from public;
grant execute on function public.is_member(uuid) to authenticated;
create table public.records (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces,
 owner_id uuid not null references auth.users,
 domain text not null check(domain in ('personal','connect','faith','performance','business','studio','conversations','vision','memories','legacy')),
 kind text not null check(kind in ('goal','habit','journal','reflection','prayer','workout','wellness','prep','project','task','decision','campaign','conversation','comment','dream','memory','service','appreciation','expense','ai_memory')),
 title text not null check(length(trim(title)) between 1 and 180),body text not null default '' check(length(body)<=12000),
 visibility text not null default 'private' check(visibility in ('private','recipient','shared')),
 recipient_id uuid references auth.users,
 parent_id uuid references public.records on delete restrict,
 status text not null default 'open' check(status in ('open','active','done')),
 due_at date, metadata jsonb not null default '{}' check(jsonb_typeof(metadata)='object' and octet_length(metadata::text)<=24000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check ((visibility='recipient' and recipient_id is not null and recipient_id<>owner_id) or (visibility<>'recipient' and recipient_id is null)),
 foreign key(workspace_id,owner_id) references public.memberships(workspace_id,user_id),
 foreign key(workspace_id,recipient_id) references public.memberships(workspace_id,user_id)
);
create index records_workspace_date on public.records(workspace_id,created_at desc);
create index records_owner on public.records(owner_id);
create index records_parent on public.records(parent_id);
create index records_recipient on public.records(recipient_id) where recipient_id is not null;
create function public.guard_record() returns trigger language plpgsql security definer set search_path='' as $$
declare parent public.records; s jsonb; field text;
begin
 if TG_OP='UPDATE' then
  if new.id<>old.id or new.owner_id<>old.owner_id or new.workspace_id<>old.workspace_id or new.created_at<>old.created_at or new.parent_id is distinct from old.parent_id then raise exception 'Record identity is immutable'; end if;
  if (new.visibility<>old.visibility or new.recipient_id is distinct from old.recipient_id) and exists(select 1 from public.records where parent_id=old.id) then raise exception 'Linked records require a coordinated audience change'; end if;
 end if;
 if new.visibility='recipient' and not exists(select 1 from public.memberships where workspace_id=new.workspace_id and user_id=new.recipient_id and active) then raise exception 'Recipient unavailable'; end if;
 if new.parent_id is not null then
  select * into parent from public.records where id=new.parent_id;
  if not found or parent.workspace_id<>new.workspace_id or not public.is_member(parent.workspace_id) or not (parent.owner_id=auth.uid() or parent.visibility='shared' or coalesce(parent.recipient_id=auth.uid(),false)) then raise exception 'Linked entry unavailable'; end if;
  if new.visibility<>parent.visibility then raise exception 'Linked entry audience must match'; end if;
  if parent.visibility='private' and new.owner_id<>parent.owner_id then raise exception 'Private link denied'; end if;
  if parent.visibility='recipient' and not ((new.owner_id=parent.owner_id and new.recipient_id=parent.recipient_id) or (new.owner_id=parent.recipient_id and new.recipient_id=parent.owner_id)) then raise exception 'Recipient link denied'; end if;
 end if;
 if exists(select 1 from jsonb_object_keys(new.metadata) k where k not in ('sets','prep','stage','audience','objective','visual','deliverables','passage','horizon','sleep','energy','bodyweight','unit','amount','currency','prompt')) then raise exception 'Unknown metadata field';end if;
 foreach field in array array['stage','audience','objective','visual','deliverables','passage','horizon','unit','currency','prompt'] loop
  if new.metadata ? field and jsonb_typeof(new.metadata->field)<>'string' then raise exception 'Invalid text metadata';end if;
 end loop;
 foreach field in array array['sleep','energy','bodyweight','amount'] loop
  if new.metadata ? field and jsonb_typeof(new.metadata->field)<>'number' then raise exception 'Invalid numeric metadata';end if;
 end loop;
 if new.metadata ? 'prep' and jsonb_typeof(new.metadata->'prep')<>'boolean' then raise exception 'Invalid prep flag';end if;
 if new.metadata ? 'sleep' and (new.metadata->>'sleep')::numeric not between 0 and 24 then raise exception 'Invalid sleep';end if;
 if new.metadata ? 'energy' and ((new.metadata->>'energy')::numeric not between 1 and 5 or (new.metadata->>'energy')::numeric<>trunc((new.metadata->>'energy')::numeric)) then raise exception 'Invalid energy';end if;
 if new.metadata ? 'bodyweight' and ((new.metadata->>'bodyweight')::numeric<=0 or (new.metadata->>'bodyweight')::numeric>1000) then raise exception 'Invalid bodyweight';end if;
 if new.metadata ? 'amount' and (new.metadata->>'amount')::numeric not between 0 and 100000000 then raise exception 'Invalid amount';end if;
 if new.metadata ? 'unit' and new.metadata->>'unit' not in ('kg','lb') then raise exception 'Invalid unit';end if;
 if new.metadata ? 'currency' and new.metadata->>'currency' not in ('USD','BRL') then raise exception 'Invalid currency';end if;
 if new.metadata ? 'stage' and new.metadata->>'stage' not in ('idea','concept','production','review','ready') then raise exception 'Invalid stage';end if;
 if new.metadata ? 'horizon' and new.metadata->>'horizon' not in ('now','next','future') then raise exception 'Invalid horizon';end if;
 if new.kind='expense' and (not new.metadata ? 'amount' or not new.metadata ? 'currency') then raise exception 'Expense amount and currency required';end if;
 if new.kind='workout' or new.metadata ? 'sets' then
  if jsonb_typeof(new.metadata->'sets') is distinct from 'array' then raise exception 'Workout sets required';end if;
  if jsonb_array_length(new.metadata->'sets') not between 1 and 100 then raise exception 'Invalid set count';end if;
  for s in select value from jsonb_array_elements(new.metadata->'sets') loop
   if jsonb_typeof(s->'exercise') is distinct from 'string' or length(trim(s->>'exercise')) not between 1 and 100 or jsonb_typeof(s->'reps') is distinct from 'number' or jsonb_typeof(s->'weight') is distinct from 'number' or (s->>'unit') is null or (s->>'unit') not in ('kg','lb') then raise exception 'Invalid workout set';end if;
   if s ? 'rpe' and (jsonb_typeof(s->'rpe')<>'number' or (s->>'rpe')::numeric not between 1 and 10) then raise exception 'Invalid effort';end if;
   if (s->>'reps')::numeric not between 1 and 1000 or (s->>'reps')::numeric<>trunc((s->>'reps')::numeric) or (s->>'weight')::numeric not between 0 and 1500 then raise exception 'Invalid workout numbers';end if;
  end loop;
 end if;
 new.updated_at=now();return new;
end;$$;
revoke all on function public.guard_record() from public;
create trigger guard_record before insert or update on public.records for each row execute function public.guard_record();
create table public.audit_events (
 id bigint generated always as identity primary key,actor_id uuid,record_id uuid not null,action text not null,
 old_visibility text,new_visibility text,created_at timestamptz not null default now()
);
create function public.audit_record() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.audit_events(actor_id,record_id,action,old_visibility,new_visibility) values(auth.uid(),coalesce(new.id,old.id),TG_OP,case when TG_OP<>'INSERT' then old.visibility end,case when TG_OP<>'DELETE' then new.visibility end);
 return coalesce(new,old);
end;$$;
revoke all on function public.audit_record() from public;
create trigger audit_record after insert or update or delete on public.records for each row execute function public.audit_record();
alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.records enable row level security;
alter table public.audit_events enable row level security;
revoke all on public.workspaces,public.memberships,public.records,public.audit_events from anon,authenticated;
grant select on public.workspaces,public.memberships,public.audit_events to authenticated;
grant select,insert,update,delete on public.records to authenticated;
create policy workspace_read on public.workspaces for select to authenticated using(public.is_member(id));
create policy members_read on public.memberships for select to authenticated using(public.is_member(workspace_id));
create policy record_read on public.records for select to authenticated using(public.is_member(workspace_id) and (owner_id=auth.uid() or visibility='shared' or (visibility='recipient' and recipient_id=auth.uid())));
create policy record_insert on public.records for insert to authenticated with check(public.is_member(workspace_id) and owner_id=auth.uid());
create policy record_update on public.records for update to authenticated using(public.is_member(workspace_id) and owner_id=auth.uid()) with check(public.is_member(workspace_id) and owner_id=auth.uid());
create policy record_delete on public.records for delete to authenticated using(public.is_member(workspace_id) and owner_id=auth.uid());
create policy audit_read on public.audit_events for select to authenticated using(actor_id=auth.uid());
-- Durable atomic per-account fixed-window quota. No content in counters.
create table public.ai_usage (user_id uuid not null references auth.users on delete cascade,window_at timestamptz not null,count int not null,primary key(user_id,window_at));
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon,authenticated;
create function public.consume_ai_request() returns boolean language plpgsql security definer set search_path='' as $$
declare current_count int;
begin
 if auth.uid() is null or not exists(select 1 from public.memberships where user_id=auth.uid() and active) then return false;end if;
 insert into public.ai_usage(user_id,window_at,count) values(auth.uid(),date_trunc('hour',now()),1)
 on conflict(user_id,window_at) do update set count=public.ai_usage.count+1 returning count into current_count;
 return current_count<=30;
end;$$;
revoke all on function public.consume_ai_request() from public;
grant execute on function public.consume_ai_request() to authenticated;
