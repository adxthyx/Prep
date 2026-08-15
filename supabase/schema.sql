begin;

create table if not exists public.prep_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prep_state_history (
  history_id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_data jsonb not null,
  previous_revision bigint not null check (previous_revision > 0),
  created_at timestamptz not null default now()
);

create index if not exists prep_state_history_user_created_idx
  on public.prep_state_history (user_id, created_at desc, history_id desc);

alter table public.prep_state enable row level security;
alter table public.prep_state_history enable row level security;

drop policy if exists "Users can select their own prep state" on public.prep_state;
create policy "Users can select their own prep state"
  on public.prep_state
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own prep state" on public.prep_state;
create policy "Users can insert their own prep state"
  on public.prep_state
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own prep state" on public.prep_state;
create policy "Users can update their own prep state"
  on public.prep_state
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own prep state" on public.prep_state;
create policy "Users can delete their own prep state"
  on public.prep_state
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can select their own prep history" on public.prep_state_history;
create policy "Users can select their own prep history"
  on public.prep_state_history
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.prep_state from anon;
revoke all on table public.prep_state_history from anon;
grant select, insert, update, delete on table public.prep_state to authenticated;
revoke all on table public.prep_state_history from authenticated;
grant select on table public.prep_state_history to authenticated;

create or replace function public.archive_prep_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.prep_state_history (user_id, previous_data, previous_revision)
  values (old.user_id, old.data, old.revision);

  delete from public.prep_state_history as history
  where history.history_id in (
    select stale.history_id
    from public.prep_state_history as stale
    where stale.user_id = old.user_id
    order by stale.created_at desc, stale.history_id desc
    offset 100
  );

  return new;
end;
$function$;

revoke execute on function public.archive_prep_state() from public;
revoke execute on function public.archive_prep_state() from anon;
revoke execute on function public.archive_prep_state() from authenticated;

drop trigger if exists prep_state_archive_before_update on public.prep_state;
create trigger prep_state_archive_before_update
  before update on public.prep_state
  for each row
  execute function public.archive_prep_state();

create or replace function public.initialize_prep_state(p_data jsonb)
returns table (
  current_data jsonb,
  current_revision bigint,
  current_created_at timestamptz,
  current_updated_at timestamptz,
  created boolean
)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_inserted_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_data is null then
    raise exception 'Prep state data is required' using errcode = '22004';
  end if;

  insert into public.prep_state (user_id, data)
  values (v_user_id, p_data)
  on conflict (user_id) do nothing;

  get diagnostics v_inserted_count = row_count;

  return query
  select state.data, state.revision, state.created_at, state.updated_at, (v_inserted_count = 1)
  from public.prep_state as state
  where state.user_id = v_user_id;
end;
$function$;

create or replace function public.save_prep_state(p_data jsonb, p_expected_revision bigint)
returns table (
  result_status text,
  current_data jsonb,
  current_revision bigint,
  current_updated_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_state public.prep_state%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_data is null then
    raise exception 'Prep state data is required' using errcode = '22004';
  end if;

  update public.prep_state as state
  set data = p_data,
      revision = state.revision + 1,
      updated_at = clock_timestamp()
  where state.user_id = v_user_id
    and state.revision = p_expected_revision
  returning state.* into v_state;

  if found then
    return query select 'saved'::text, v_state.data, v_state.revision, v_state.updated_at;
    return;
  end if;

  select state.* into v_state
  from public.prep_state as state
  where state.user_id = v_user_id;

  if found then
    return query select 'conflict'::text, v_state.data, v_state.revision, v_state.updated_at;
  else
    return query select 'missing'::text, null::jsonb, null::bigint, null::timestamptz;
  end if;
end;
$function$;

create or replace function public.restore_prep_state(p_history_id bigint, p_expected_revision bigint)
returns table (
  result_status text,
  current_data jsonb,
  current_revision bigint,
  current_updated_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_restore_data jsonb;
  v_state public.prep_state%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select history.previous_data into v_restore_data
  from public.prep_state_history as history
  where history.history_id = p_history_id
    and history.user_id = v_user_id;

  if not found then
    select state.* into v_state
    from public.prep_state as state
    where state.user_id = v_user_id;
    return query select 'not_found'::text, v_state.data, v_state.revision, v_state.updated_at;
    return;
  end if;

  update public.prep_state as state
  set data = v_restore_data,
      revision = state.revision + 1,
      updated_at = clock_timestamp()
  where state.user_id = v_user_id
    and state.revision = p_expected_revision
  returning state.* into v_state;

  if found then
    return query select 'saved'::text, v_state.data, v_state.revision, v_state.updated_at;
    return;
  end if;

  select state.* into v_state
  from public.prep_state as state
  where state.user_id = v_user_id;

  if found then
    return query select 'conflict'::text, v_state.data, v_state.revision, v_state.updated_at;
  else
    return query select 'missing'::text, null::jsonb, null::bigint, null::timestamptz;
  end if;
end;
$function$;

revoke execute on function public.initialize_prep_state(jsonb) from public;
revoke execute on function public.initialize_prep_state(jsonb) from anon;
grant execute on function public.initialize_prep_state(jsonb) to authenticated;

revoke execute on function public.save_prep_state(jsonb, bigint) from public;
revoke execute on function public.save_prep_state(jsonb, bigint) from anon;
grant execute on function public.save_prep_state(jsonb, bigint) to authenticated;

revoke execute on function public.restore_prep_state(bigint, bigint) from public;
revoke execute on function public.restore_prep_state(bigint, bigint) from anon;
grant execute on function public.restore_prep_state(bigint, bigint) to authenticated;

do $publication$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'prep_state'
     ) then
    execute 'alter publication supabase_realtime add table public.prep_state';
  end if;
end;
$publication$;

comment on table public.prep_state is 'One JSONB Prep application state per authenticated user.';
comment on table public.prep_state_history is 'Bounded server-side history captured before each Prep state update.';

commit;
