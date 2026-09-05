import { proxyWaha } from '@/lib/waha/proxy';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return proxyWaha(request, 'qr');
}
