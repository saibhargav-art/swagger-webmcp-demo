import { json, logAction, requireActor, withCors } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  return withCors(req, async () => {
  const auth = await requireActor(req, ['support', 'admin'], 'createOrder');
  if ('error' in auth) return auth.error;

  const body = await req.json();
  const { data, error } = await auth.client
    .from('orders')
    .insert({ customer_name: body.customer_name, amount: body.amount, created_by: auth.actor.id })
    .select()
    .single();

  if (error) {
    await logAction(auth.client, auth.actor.id, 'createOrder', 'error', undefined, error.message);
    return json({ error: error.message }, 400);
  }

  await logAction(auth.client, auth.actor.id, 'createOrder', 'success', data.id);
  return json(data);
  });
});
