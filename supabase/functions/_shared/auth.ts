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

  const { data: existingActor, error: actorError } = await client
    .from('users')
    .select('id,email,role')
    .eq('id', authData.user.id)
    .maybeSingle();
  if (actorError) return { error: json({ error: 'Unable to load application user' }, 500) };

  let actor = existingActor;
  if (!actor) {
    const email = authData.user.email;
    if (!email) return { error: json({ error: 'Authenticated user has no email address' }, 403) };

    const metadata = authData.user.user_metadata ?? {};
    const { data: provisionedActor, error: provisionError } = await client
      .from('users')
      .upsert({
        id: authData.user.id,
        email,
        full_name: metadata.full_name ?? metadata.name ?? null,
        role: actorRole(authData.user.app_metadata, metadata),
      }, { onConflict: 'id' })
      .select('id,email,role')
      .single();

    if (provisionError || !provisionedActor) {
      return { error: json({ error: 'Unable to provision application user' }, 500) };
    }
    actor = provisionedActor;
  }

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

function actorRole(appMetadata: Record<string, unknown>, userMetadata: Record<string, unknown>): Role {
  const appRole = appMetadata.role;
  if (isRole(appRole)) return appRole;

  // Existing demo accounts may store the role in user metadata. Production
  // customer apps should assign privileged roles through app metadata or their
  // own application profile table.
  const legacyRole = userMetadata.role;
  return isRole(legacyRole) ? legacyRole : 'viewer';
}

function isRole(value: unknown): value is Role {
  return value === 'admin' || value === 'support' || value === 'viewer';
}

export async function logAction(client: ReturnType<typeof adminClient>, actorId: string, action: string, status: string, targetId?: string, message?: string) {
  await client.from('activity_logs').insert({ actor_id: actorId, action, target_id: targetId, status, message });
}
