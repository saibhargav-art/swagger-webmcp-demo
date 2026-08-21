create or replace function public.profile_role_for_auth_user(
  app_metadata jsonb,
  user_metadata jsonb
)
returns public.user_role
language sql
immutable
set search_path = public
as $$
  select case
    when app_metadata ->> 'role' in ('admin', 'support', 'viewer')
      then (app_metadata ->> 'role')::public.user_role
    -- Legacy fallback for the demo's existing seeded accounts. New deployments
    -- should assign roles through app_metadata or public.users.
    when user_metadata ->> 'role' in ('admin', 'support', 'viewer')
      then (user_metadata ->> 'role')::public.user_role
    else 'viewer'::public.user_role
  end
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    public.profile_role_for_auth_user(new.raw_app_meta_data, new.raw_user_meta_data)
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.users.full_name);

  return new;
end;
$$;

insert into public.users (id, email, full_name, role)
select
  auth_user.id,
  auth_user.email,
  coalesce(auth_user.raw_user_meta_data ->> 'full_name', auth_user.raw_user_meta_data ->> 'name'),
  public.profile_role_for_auth_user(auth_user.raw_app_meta_data, auth_user.raw_user_meta_data)
from auth.users as auth_user
on conflict (id) do update
set
  email = excluded.email,
  full_name = coalesce(excluded.full_name, public.users.full_name);
