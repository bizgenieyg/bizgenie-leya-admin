import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callbackDestination } from '@/lib/auth/redirect';

/** Shared auth callback: email links fail with confirm_* codes, Google sign-in with oauth_failed. */
export async function handleAuthCallback(request: Request, flow: 'email' | 'oauth'): Promise<NextResponse> {
  const url = new URL(request.url);
  // Use the incoming host when Next reconstructs the URL with an internal host.
  url.host = request.headers.get('host') ?? url.host;
  const params = url.searchParams;
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, url.origin), { headers: { 'Cache-Control': 'no-store' } });
  const failed = flow === 'oauth' ? 'oauth_failed' : 'confirm_failed';
  if (params.has('error') || params.has('error_description')) {
    if (flow === 'oauth') return fail(failed);
    const expired = params.get('error_code') === 'otp_expired' || /expired|invalid|ист[её]к/i.test(params.get('error_description') ?? '');
    return fail(expired ? 'confirm_expired' : failed);
  }
  const code = params.get('code');
  if (!code) return fail(failed);
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.session) return fail(failed);
    return NextResponse.redirect(callbackDestination(params.get('next'), url.origin, params.get('type') === 'recovery'), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return fail(failed);
  }
}
