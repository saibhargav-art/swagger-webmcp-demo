import { json, logAction, requireActor, withCors } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  return withCors(req, async () => {
  const auth = await requireActor(req, ['admin'], 'updateQuota');
  if ('error' in auth) return auth.error;

  const body = await req.json();
  const { data, error } = await auth.client
    .from('users')
    .update({ quota: body.quota })
    .eq('id', body.user_id)
    .select()
    .single();

  if (error) {
    await logAction(auth.client, auth.actor.id, 'updateQuota', 'error', body.user_id, error.message);
    return json({ error: error.message }, 400);
  }

  await logAction(auth.client, auth.actor.id, 'updateQuota', 'success', body.user_id);
  return json(data);
  });
});
