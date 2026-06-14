import { json, logAction, requireActor, withCors } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  return withCors(req, async () => {
  // Validate HTTP method
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const auth = await requireActor(req, ['admin'], 'approveRefund');
  if ('error' in auth) return auth.error;

  // Safely parse JSON body and validate ID
  const { id } = await req.json().catch(() => ({}));
  if (!id) {
    return json({ error: 'Order ID is required' }, 400);
  }

  const { data, error } = await auth.client
    .from('orders')
    .update({ status: 'refund_approved' })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    await logAction(auth.client, auth.actor.id, 'approveRefund', 'error', id, error.message);
    return json({ error: error.message }, 400);
  }

  await logAction(auth.client, auth.actor.id, 'approveRefund', 'success', id);
  return json(data);
  });
});
