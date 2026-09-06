import { proxyWaha } from '@/lib/waha/proxy';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return proxyWaha(request, 'reconnect');
}
