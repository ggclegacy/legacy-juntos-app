create table public.training_documents (
 id uuid primary key, owner_id uuid not null references auth.users on delete cascade,
 workspace_id uuid not null references public.workspaces on delete cascade,
 revision integer not null default 1 check(revision>0),
 payload jsonb not null check(jsonb_typeof(payload)='object' and payload ? 'kind' and payload->>'kind' in ('program','session','prep') and octet_length(payload::text)<500000),
 updated_at timestamptz not null default now()
);
create index training_owner on public.training_documents(owner_id,workspace_id,updated_at);
alter table public.training_documents enable row level security;
create policy training_owner_read on public.training_documents for select to authenticated using(owner_id=auth.uid() and public.is_member(workspace_id));
create policy training_owner_insert on public.training_documents for insert to authenticated with check(owner_id=auth.uid() and public.is_member(workspace_id));
create policy training_owner_update on public.training_documents for update to authenticated using(owner_id=auth.uid() and public.is_member(workspace_id)) with check(owner_id=auth.uid() and public.is_member(workspace_id));
create policy training_owner_delete on public.training_documents for delete to authenticated using(owner_id=auth.uid() and public.is_member(workspace_id));
create function public.guard_training() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='INSERT' and new.revision<>1 then raise exception 'Initial revision must be one';end if;
 if TG_OP='UPDATE' then
  if new.id<>old.id or new.owner_id<>old.owner_id or new.workspace_id<>old.workspace_id or new.payload->>'kind'<>old.payload->>'kind' then raise exception 'Training identity is immutable';end if;
  if new.revision<>old.revision+1 then raise exception 'Training revision conflict';end if;
 end if;
 new.updated_at=now();return new;
end;$$;
create trigger guard_training before insert or update on public.training_documents for each row execute function public.guard_training();
revoke all on public.training_documents from anon;
grant select,insert,update,delete on public.training_documents to authenticated;
create unique index one_active_training_session on public.training_documents(owner_id) where payload->>'kind'='session' and payload->>'finished' is null;
create unique index one_training_prep on public.training_documents(owner_id) where payload->>'kind'='prep';
