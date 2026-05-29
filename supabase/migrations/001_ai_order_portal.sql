create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('admin', 'support', 'viewer');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.order_status as enum ('pending', 'processing', 'fulfilled', 'cancelled', 'refund_approved');
exception when duplicate_object then null;
end $$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.user_role not null default 'viewer',
  quota integer not null default 10,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  status public.order_status not null default 'pending',
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id),
  action text not null,
  target_id uuid,
  status text not null check (status in ('success', 'denied', 'error')),
  message text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.orders enable row level security;
alter table public.activity_logs enable row level security;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
begin
  requested_role := coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'viewer'::public.user_role);

  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    requested_role
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.users.full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

insert into public.users (id, email, full_name, role)
select
  auth_users.id,
  auth_users.email,
  coalesce(auth_users.raw_user_meta_data ->> 'full_name', auth_users.raw_user_meta_data ->> 'name'),
  coalesce((auth_users.raw_user_meta_data ->> 'role')::public.user_role, 'viewer'::public.user_role)
from auth.users as auth_users
on conflict (id) do nothing;

drop policy if exists "users can read own profile" on public.users;
create policy "users can read own profile"
on public.users for select
using (id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "viewers can read orders" on public.orders;
create policy "viewers can read orders"
on public.orders for select
using (auth.uid() is not null);

drop policy if exists "support can create orders" on public.orders;
create policy "support can create orders"
on public.orders for insert
with check (public.current_user_role() in ('support', 'admin') and created_by = auth.uid());

drop policy if exists "support can update orders" on public.orders;
create policy "support can update orders"
on public.orders for update
using (public.current_user_role() in ('support', 'admin'))
with check (public.current_user_role() in ('support', 'admin'));

drop policy if exists "admins can delete orders" on public.orders;
create policy "admins can delete orders"
on public.orders for delete
using (public.current_user_role() = 'admin');

drop policy if exists "users can read activity logs" on public.activity_logs;
create policy "users can read activity logs"
on public.activity_logs for select
using (auth.uid() is not null);

drop policy if exists "admins can update users" on public.users;
create policy "admins can update users"
on public.users for update
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
