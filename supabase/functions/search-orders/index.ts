import { json, logAction, requireActor, withCors } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  return withCors(req, async () => {
  const auth = await requireActor(req, ['viewer', 'support', 'admin'], 'searchOrders');
  if ('error' in auth) return auth.error;

  const body = await req.json();
  const query = String(body.query || '').trim();
  let builder = auth.client.from('orders').select('*').order('created_at', { ascending: false }).limit(50);
  if (query) builder = builder.ilike('customer_name', `%${query}%`);
  const { data, error } = await builder;

  if (error) {
    await logAction(auth.client, auth.actor.id, 'searchOrders', 'error', undefined, error.message);
    return json({ error: error.message }, 400);
  }

  await logAction(auth.client, auth.actor.id, 'searchOrders', 'success', undefined, query || 'all orders');
  return json(data);
  });
});
