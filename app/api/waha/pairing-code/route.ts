import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/onboarding/roles';
import { readLeyaBackendEnv } from '@/lib/backend/leya-env';
import { normalizePhone, COUNTRY_CODES } from '@/lib/tenant/phone';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };

/**
 * Z10 «Подключаюсь с этого телефона»: a pairing code for the business number (WAHA GOWS auth/request-code).
 * Errors are codes for the cabinet's dictionaries — never WAHA's text.
 */
export async function POST(request: Request) {
  const fail = (code: string, status: number) => Response.json({ code }, { status, headers });
  try {
    const origin = new URL(request.url); origin.host = request.headers.get('host') ?? origin.host;
    if (request.headers.get('origin') !== origin.origin) return fail('settingsRestricted', 403);
    const db = createClient();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return fail('connectionSessionExpired', 401);
    const { data, error } = await db.from('tenant_users').select('tenant_id,role').eq('user_id', user.id).limit(2);
    if (error || data?.length !== 1) return fail('settingsRestricted', 403);
    try { requireRole(['owner', 'admin'], data[0].role); } catch { return fail('settingsRestricted', 403); }
    const body = await request.json().catch(() => null);
    const country = typeof body?.country === 'string' && (COUNTRY_CODES as readonly string[]).includes(body.country) ? body.country : COUNTRY_CODES[0];
    const phone = typeof body?.phone === 'string' ? normalizePhone(body.phone, country) : null;
    if (!phone) return fail('pairingPhoneInvalid', 400);
    const { apiUrl, adminApiKey } = readLeyaBackendEnv(); if (!apiUrl || !adminApiKey) return fail('serviceUnavailable', 503);
    const url = new URL('/api/admin/waha/pairing-code', apiUrl); url.searchParams.set('tenantId', data[0].tenant_id);
    const upstream = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${adminApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(25000) });
    if (!upstream.ok) return fail(upstream.status === 409 ? 'pairingUnavailable' : upstream.status === 400 ? 'pairingPhoneInvalid' : 'pairingFailed', upstream.status === 409 || upstream.status === 400 ? upstream.status : 502);
    const result = await upstream.json();
    return typeof result?.code === 'string' && /^[A-Z0-9]{4}-?[A-Z0-9]{4}$/i.test(result.code) ? Response.json({ code: result.code }, { headers }) : fail('pairingFailed', 502);
  } catch { console.error('waha_pairing_code_proxy_failed'); return fail('pairingFailed', 502); }
}
