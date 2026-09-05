import 'server-only';

import { createClient } from '@/lib/supabase/server';

type Operation = 'create' | 'status' | 'qr';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

function failure(message: string, status: number) {
  return Response.json({ error: message }, { status, headers });
}

export async function proxyWaha(request: Request, operation: Operation): Promise<Response> {
  // Reject cross-origin mutations before exercising the privileged backend credential.
  if (request.method === 'POST' && request.headers.get('origin') !== new URL(request.url).origin) {
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
    if (role !== 'owner' && role !== 'admin') return failure('Подключение доступно владельцу или администратору бизнеса.', 403);

    const baseUrl = process.env.LEIA_API_URL;
    const secret = process.env.LEIA_ADMIN_API_KEY;
    if (!baseUrl || !secret) {
      console.error('waha_proxy_configuration_missing', { operation });
      return failure('Подключение WhatsApp пока недоступно. Попробуйте позже.', 503);
    }
    const url = new URL(`/api/admin/waha/${operation}`, baseUrl);
    if (operation !== 'create') url.searchParams.set('tenantId', tenantId);
    const upstream = await fetch(url, {
      method: operation === 'create' ? 'POST' : 'GET',
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
      if (upstream.status === 404 && operation === 'status') return Response.json({ status: 'NOT_CREATED' }, { headers });
      return failure(operation === 'qr' ? 'QR пока недоступен. Попробуйте обновить его.' : 'Не удалось связаться с WhatsApp. Попробуйте ещё раз.', 502);
    }
    if (operation === 'qr') {
      const contentType = upstream.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().startsWith('image/')) throw new Error('Invalid QR response');
      return new Response(await upstream.arrayBuffer(), { headers: { ...headers, 'Content-Type': contentType, 'Content-Security-Policy': "default-src 'none'; sandbox" } });
    }
    const data = await upstream.json();
    const status = operation === 'status' ? data?.status?.status : data?.status;
    if (typeof status !== 'string') throw new Error('Invalid status response');
    // Only send the status needed by the UI, not arbitrary admin API data.
    return Response.json({ status }, { headers });
  } catch {
    console.error('waha_proxy_request_failed', { operation });
    return failure('Сервис подключения временно недоступен. Попробуйте ещё раз.', 502);
  }
}
