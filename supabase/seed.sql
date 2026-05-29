-- Create these Auth users in Supabase first, then replace the UUIDs below with their auth.users ids.
insert into public.users (id, email, full_name, role, quota) values
  ('00000000-0000-0000-0000-000000000001', 'admin@example.com', 'Avery Admin', 'admin', 100),
  ('00000000-0000-0000-0000-000000000002', 'support@example.com', 'Sam Support', 'support', 50),
  ('00000000-0000-0000-0000-000000000003', 'viewer@example.com', 'Val Viewer', 'viewer', 10)
on conflict (id) do update set role = excluded.role, quota = excluded.quota;

insert into public.orders (customer_name, amount, status, created_by) values
  ('Northstar Supply', 1290.00, 'pending', '00000000-0000-0000-0000-000000000002'),
  ('Acme Finance', 875.50, 'processing', '00000000-0000-0000-0000-000000000002'),
  ('Urban Grid Co', 2440.20, 'refund_approved', '00000000-0000-0000-0000-000000000001');
