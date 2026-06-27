import { json, logAction, requireActor, withCors } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  return withCors(req, async () => {
    const auth = await requireActor(req, ['viewer', 'support', 'admin'], 'listOrders');
    if ('error' in auth) return auth.error;

    const { data, error } = await auth.client
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      await logAction(auth.client, auth.actor.id, 'listOrders', 'error', undefined, error.message);
      return json({ error: error.message }, 400);
    }

    await logAction(auth.client, auth.actor.id, 'listOrders', 'success', undefined, 'latest orders');
    return json(data);
  });
});
