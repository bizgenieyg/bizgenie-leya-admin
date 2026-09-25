import { handleAuthCallback } from '@/lib/auth/callback';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handleAuthCallback(request, 'email');
}
