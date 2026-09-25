export function callbackDestination(next: string | null, origin: string, recovery: boolean) {
  const fallback = recovery ? '/reset-password' : '/onboarding/step-1';
  if (!next?.startsWith('/') || next.startsWith('//') || /[\\\u0000-\u0020]/.test(next)) return new URL(fallback, origin);
  const target = new URL(next, origin);
  return target.origin === origin ? target : new URL(fallback, origin);
}

export const confirmationErrors: Record<string, string> = {
  confirm_failed: 'confirmationFailed',
  confirm_expired: 'confirmationExpired',
};
