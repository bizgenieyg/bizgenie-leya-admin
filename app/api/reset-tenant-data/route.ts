import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/onboarding/roles';
import { readLeyaBackendEnv } from '@/lib/backend/leya-env';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
export async function POST(request: Request) {
  const fail = (code: string, status: number) => Response.json({ code }, { status, headers });
  try {
    const origin = new URL(request.url);
    origin.host = request.headers.get('host') ?? origin.host;
    if (request.headers.get('origin') !== origin.origin) return fail('settingsRestricted', 403);
    const db = createClient();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return fail('connectionSessionExpired', 401);
    const { data, error } = await db.from('tenant_users').select('tenant_id,role').eq('user_id', user.id).limit(2);
    if (error || data?.length !== 1) return fail('settingsRestricted', 403);
    try { requireRole(['owner', 'admin'], data[0].role); } catch { return fail('settingsRestricted', 403); }
    const { apiUrl, adminApiKey } = readLeyaBackendEnv();
    if (!apiUrl || !adminApiKey) return fail('serviceUnavailable', 503);
    const url = new URL('/api/admin/reset-tenant-data', apiUrl);
    url.searchParams.set('tenantId', data[0].tenant_id);
    const upstream = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${adminApiKey}` }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!upstream.ok) return fail('serviceUnavailable', upstream.status);
    return Response.json({ reset: true }, { headers });
  } catch { console.error('reset_tenant_data_proxy_failed'); return fail('serviceUnavailable', 502); }
}
