'use client';

import { type FormEvent, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {useI18n} from '@/lib/i18n';
import PublicShell from '@/components/ui/public-shell';

export default function ForgotPasswordPage() {
  const {t}=useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await createClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
    } catch {
      // Identical UI for all outcomes; never disclose whether an account exists.
    } finally { setSent(true); setLoading(false); }
  }

  return (
    <PublicShell>
        <h1>{t('resetTitle')}</h1>
        {sent ? <p role="status" className="auth-copy">{t('resetSent')}</p> : (
          <form onSubmit={submit} className="space-y-4">
            <div><label htmlFor="email" className="field-label">{t('email')}</label>
              <input id="email" type="email" autoComplete="email" required disabled={loading} value={email} onChange={(event) => setEmail(event.target.value)} className="field-control" /></div>
            <button type="submit" disabled={loading} className="button primary full">{loading ? t('loading') : t('sendLink')}</button>
          </form>
        )}
        <Link href="/login" className="text-link centered">{t('loginAction')}</Link>
    </PublicShell>
  );
}
