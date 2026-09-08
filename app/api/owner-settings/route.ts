import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/onboarding/roles';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
async function proxy(request: Request) {
  const fail = (error: string, status: number) => Response.json({ error }, { status, headers });
  try {
    const origin = new URL(request.url);
    origin.host = request.headers.get('host') ?? origin.host;
    if (request.method === 'POST' && request.headers.get('origin') !== origin.origin) return fail('Запрос отклонён.', 403);
    const db = createClient();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return fail('Войдите в кабинет.', 401);
    const { data, error } = await db.from('tenant_users').select('tenant_id,role').eq('user_id', user.id).limit(2);
    if (error || data?.length !== 1) return fail('Не удалось определить бизнес.', 403);
    try { requireRole(['owner', 'admin'], data[0].role); } catch { return fail('Доступно владельцу или администратору.', 403); }
    if (!process.env.LEIA_API_URL || !process.env.LEIA_ADMIN_API_KEY) return fail('Сервис временно недоступен.', 503);
    const url = new URL('/api/admin/owner-settings', process.env.LEIA_API_URL);
    url.searchParams.set('tenantId', data[0].tenant_id);
    const body = request.method === 'POST' ? await request.json() : null;
    const upstream = await fetch(url, { method: request.method, headers: { Authorization: `Bearer ${process.env.LEIA_ADMIN_API_KEY}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify({ phone: body.phone, quietStart: body.quietStart, quietEnd: body.quietEnd, timeZone: body.timeZone }) } : {}), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!upstream.ok) return fail(upstream.status === 400 ? 'Проверьте номер владельца и тихие часы. Номер должен отличаться от бизнес-номера.' : upstream.status === 409 ? 'Сначала подключите бизнес-номер WhatsApp.' : 'Не удалось сохранить настройки. Попробуйте снова.', upstream.status);
    const result = await upstream.json();
    return Response.json(request.method === 'POST' ? { pairingCommand: result.pairingCommand } : { timeZone: result.timeZone, phone: result.phone, quietStart: result.quietStart, quietEnd: result.quietEnd, paired: result.paired === true }, { headers });
  } catch { console.error('owner_settings_proxy_failed'); return fail('Сервис временно недоступен.', 502); }
}
export const GET = proxy;
export const POST = proxy;
