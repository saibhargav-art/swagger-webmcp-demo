# AI Order Management Portal

React + TypeScript demo for authenticated browser sessions, RBAC, Supabase Edge Functions, and route-scoped WebMCP tool exposure.

## What is included

- Supabase email/password login with persisted browser session
- Protected dashboard, orders, admin, and activity log pages
- Viewer, support, and admin role checks in the UI
- Backend role revalidation in every Edge Function
- Activity logging for successful, denied, and failed tool actions
- WebMCP integration through a hosted `webapi.json` contract and named API handlers

## Environment

Copy `.env.example` to `.env` and set:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Supabase setup

1. Apply `supabase/migrations/001_ai_order_portal.sql`.
2. Create three Supabase Auth email/password users:
   - `admin@example.com`
   - `support@example.com`
   - `viewer@example.com`
3. Update `supabase/seed.sql` with the real `auth.users.id` values for those accounts, then run it.
4. Deploy the functions:

```bash
supabase functions deploy create-order
supabase functions deploy update-order-status
supabase functions deploy delete-order
supabase functions deploy approve-refund
supabase functions deploy search-orders
supabase functions deploy update-quota
```

5. Set function secrets:

```bash
supabase secrets set SUPABASE_URL=https://your-project-ref.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## WebMCP integration

- The customer app hosts `/webapi.json`.
- Set `servers[0].url` in `webapi.json` to the backend that executes tools, for example `https://your-project-ref.supabase.co/functions/v1`.
- Order tools: `createOrder`, `searchOrders`, `updateOrderStatus`.
- Admin tools: `deleteOrder`, `approveRefund`, `updateQuota`.
- UI handlers live in `src/lib/supabaseApi.ts` as `orderToolHandlers` and `adminToolHandlers`.
- Tool definitions live in `public/webapi.json`.

All tool execution endpoints require a valid Supabase JWT and re-check role permissions server-side.

## Run locally

```bash
npm install
npm run dev
```
