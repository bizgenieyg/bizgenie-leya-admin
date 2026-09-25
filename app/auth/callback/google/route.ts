import { handleAuthCallback } from '@/lib/auth/callback';

export const dynamic = 'force-dynamic';

/** Google sign-in lands here so its failures (cancelled, provider disabled) get the OAuth message. */
export async function GET(request: Request) {
  return handleAuthCallback(request, 'oauth');
}
