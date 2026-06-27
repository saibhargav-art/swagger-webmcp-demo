import { json, logAction, requireActor, withCors } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  return withCors(req, async () => {
    const auth = await requireActor(req, ['viewer', 'support', 'admin'], 'getOrderStatus');
    if ('error' in auth) return auth.error;

    const body = await req.json();
    const { data, error } = await auth.client
      .from('orders')
      .select('id,customer_name,amount,status,created_at')
      .eq('id', body.id)
      .single();

    if (error) {
      await logAction(auth.client, auth.actor.id, 'getOrderStatus', 'error', body.id, error.message);
      return json({ error: error.message }, 400);
    }

    await logAction(auth.client, auth.actor.id, 'getOrderStatus', 'success', data.id);
    return json(data);
  });
});
