import 'server-only';

import { requireRole } from '@/lib/onboarding/roles';

import { createClient } from '@/lib/supabase/server';
import {readLeyaBackendEnv} from '@/lib/backend/leya-env';

const operations = {
  create: { path: '/api/admin/waha/create', method: 'POST' },
  status: { path: '/api/admin/waha/status', method: 'GET' },
  qr: { path: '/api/admin/waha/qr', method: 'GET' },
  disconnect: { path: '/api/admin/waha/disconnect', method: 'POST' },
  reconnect: { path: '/api/admin/waha/reconnect', method: 'POST' },
} as const;
type Operation = keyof typeof operations;
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

function failure(message: string, status: number) {
  return Response.json({ error: message }, { status, headers });
}

export async function proxyWaha(request: Request, operation: Operation): Promise<Response> {
  // Reject cross-origin mutations before exercising the privileged backend credential.
  const expectedOrigin = new URL(request.url);
  // Next.js may reconstruct request.url with its internal hostname.
  expectedOrigin.host = request.headers.get('host') ?? expectedOrigin.host;
  if (request.method === 'POST' && request.headers.get('origin') !== expectedOrigin.origin) {
    return failure('Запрос отклонён. Обновите страницу.', 403);
  }

  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return failure('Сессия истекла. Войдите снова.', 401);

    const { data: memberships, error } = await supabase.from('tenant_users')
      .select('tenant_id, role').eq('user_id', user.id).limit(2);
    if (error) {
      console.error('waha_proxy_membership_failed', { operation });
      return failure('Не удалось проверить доступ к бизнесу.', 503);
    }
    if (!memberships?.length) return failure('Бизнес не найден или недоступен.', 403);
    if (memberships.length !== 1) return failure('Не удалось однозначно определить текущий бизнес.', 409);
    const { tenant_id: tenantId, role } = memberships[0];
    try { requireRole(operation === 'status' ? ['owner', 'admin', 'viewer'] : ['owner', 'admin'], role); } catch {
      return failure('Подключение доступно владельцу или администратору бизнеса.', 403);
    }

    const {apiUrl:baseUrl,adminApiKey:secret}=readLeyaBackendEnv();
    if (!baseUrl || !secret) {
      console.error('waha_proxy_configuration_missing', { operation });
      return failure('Подключение WhatsApp пока недоступно. Попробуйте позже.', 503);
    }
    const url = new URL(operations[operation].path, baseUrl);
    if (operation !== 'create') url.searchParams.set('tenantId', tenantId);
    const upstream = await fetch(url, {
      method: operations[operation].method,
      headers: {
        Authorization: `Bearer ${secret}`,
        Accept: operation === 'qr' ? 'image/png' : 'application/json',
        ...(operation === 'create' ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(operation === 'create' ? { body: JSON.stringify({ tenantId }) } : {}),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) {
      // Never log headers, URLs, response bodies or exception messages containing secrets/QR data.
      console.error('waha_proxy_upstream_failed', { operation, status: upstream.status });
      if (upstream.status === 404 && operation === 'status') {
        const body = await upstream.text();
        // A route/proxy HTML 404 is not proof that the tenant has no session.
        if (!body.trim() || (upstream.headers.get('content-type')?.includes('application/json') && JSON.parse(body)?.error === 'WhatsApp session not found')) {
          return Response.json({ status: 'NOT_CREATED' }, { headers });
        }
      }
      if (upstream.status === 409 && operation === 'qr') {
        const data = await upstream.json();
        if (typeof data.status === 'string') return Response.json({ status: data.status, qrAvailable: false }, { status: 409, headers });
      }
      if (upstream.status < 500) return failure('Не удалось выполнить действие WhatsApp. Обновите статус подключения.', upstream.status);
      return failure(operation === 'qr' ? 'QR пока недоступен. Попробуйте обновить его.' : 'Не удалось связаться с WhatsApp. Попробуйте ещё раз.', 502);
    }
    if (operation === 'qr') {
      const contentType = upstream.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().startsWith('image/')) throw new Error('Invalid QR response');
      return new Response(upstream.body, { headers: { ...headers, 'Content-Type': contentType, 'Content-Security-Policy': "default-src 'none'; sandbox" } });
    }
    const body = await upstream.text();
    const data = body.trim() ? JSON.parse(body) : null;
    if (operation === 'status' && (data === null || (typeof data === 'object' && Object.keys(data).length === 0))) {
      return Response.json({ status: 'NOT_CREATED' }, { headers });
    }
    if (operation === 'disconnect') {
      if (data?.disconnected !== true) throw new Error('Invalid disconnect response');
      return Response.json({ status: 'DISCONNECTED' }, { headers });
    }
    const status = typeof data?.status === 'string' ? data.status : data?.status?.status;
    if (typeof status !== 'string') throw new Error('Invalid status response');
    // Only send the status needed by the UI, not arbitrary admin API data.
    return Response.json({ status, qrAvailable: status === 'SCAN_QR_CODE' && data?.qrAvailable !== false,
      ...(status === 'FAILED' && typeof data?.reason === 'string' ? { reason: data.reason.slice(0, 300) } : {})
    }, { status: upstream.status, headers });
  } catch {
    console.error('waha_proxy_request_failed', { operation });
    return failure('Сервис подключения временно недоступен. Попробуйте ещё раз.', 502);
  }
}
