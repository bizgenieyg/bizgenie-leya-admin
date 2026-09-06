import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callbackDestination } from '@/lib/auth/redirect';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  // Use the incoming host when Next reconstructs the URL with an internal host.
  url.host = request.headers.get('host') ?? url.host;
  const params = url.searchParams;
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, url.origin), { headers: { 'Cache-Control': 'no-store' } });
  if (params.has('error') || params.has('error_description')) {
    const expired = params.get('error_code') === 'otp_expired' || /expired|invalid|ист[её]к/i.test(params.get('error_description') ?? '');
    return fail(expired ? 'confirm_expired' : 'confirm_failed');
  }
  const code = params.get('code');
  if (!code) return fail('confirm_failed');
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.session) return fail('confirm_failed');
    return NextResponse.redirect(callbackDestination(params.get('next'), url.origin, params.get('type') === 'recovery'), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return fail('confirm_failed');
  }
}
