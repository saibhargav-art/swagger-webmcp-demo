import { json, logAction, requireActor, withCors } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  return withCors(req, async () => {
  const auth = await requireActor(req, ['admin'], 'deleteOrder');
  if ('error' in auth) return auth.error;

  const body = await req.json();
  const { error } = await auth.client.from('orders').delete().eq('id', body.id);
  if (error) {
    await logAction(auth.client, auth.actor.id, 'deleteOrder', 'error', body.id, error.message);
    return json({ error: error.message }, 400);
  }

  await logAction(auth.client, auth.actor.id, 'deleteOrder', 'success', body.id);
  return json({ ok: true });
  });
});
