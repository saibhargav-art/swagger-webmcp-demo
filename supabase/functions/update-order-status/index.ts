import { json, logAction, requireActor, withCors } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  return withCors(req, async () => {
  const auth = await requireActor(req, ['support', 'admin'], 'updateOrderStatus');
  if ('error' in auth) return auth.error;

  const body = await req.json();
  const { data, error } = await auth.client
    .from('orders')
    .update({ status: body.status })
    .eq('id', body.id)
    .select()
    .single();

  if (error) {
    await logAction(auth.client, auth.actor.id, 'updateOrderStatus', 'error', body.id, error.message);
    return json({ error: error.message }, 400);
  }

  await logAction(auth.client, auth.actor.id, 'updateOrderStatus', 'success', body.id);
  return json(data);
  });
});
