import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

export type Role = 'admin' | 'support' | 'viewer';

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function withCors(req: Request, handler: () => Response | Promise<Response>) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    return await handler();
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected edge function error' }, 500);
  }
}

export function adminClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

export async function requireActor(req: Request, allowed: Role[], action: string) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return { error: json({ error: 'Missing Authorization header' }, 401) };

  const client = adminClient();
  const token = authHeader.replace('Bearer ', '');
  const { data: authData, error: authError } = await client.auth.getUser(token);
  if (authError || !authData.user) return { error: json({ error: 'Invalid session' }, 401) };

  const { data: actor, error: actorError } = await client
    .from('users')
    .select('id,email,role')
    .eq('id', authData.user.id)
    .single();
  if (actorError || !actor) return { error: json({ error: 'Application user not found' }, 403) };

  if (!allowed.includes(actor.role)) {
    await client.from('activity_logs').insert({
      actor_id: actor.id,
      action,
      status: 'denied',
      message: `Requires ${allowed.join(' or')} role`,
    });
    return { error: json({ error: 'Permission denied' }, 403) };
  }

  return { client, actor };
}

export async function logAction(client: ReturnType<typeof adminClient>, actorId: string, action: string, status: string, targetId?: string, message?: string) {
  await client.from('activity_logs').insert({ actor_id: actorId, action, target_id: targetId, status, message });
}
