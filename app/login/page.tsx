'use client';

import { type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { confirmationErrors } from '@/lib/auth/redirect';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';
import {useI18n} from '@/lib/i18n';
import PublicShell from '@/components/ui/public-shell';

type AuthMode = 'login' | 'signup';

export default function LoginPage() {
  const {t}=useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get('error');
    if (reason === 'session_expired') setError(t('sessionExpired'));
    else if (reason && confirmationErrors[reason]) setError(confirmationErrors[reason]);
  }, [t]);

  async function resendConfirmation() {
    if (loading) return;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const { error } = await createClient().auth.resend({ type: 'signup', email: confirmationEmail, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
      if (error) setError(t('sendMailError'));
      else setNotice(t('mailResent'));
    } catch { setError(t('sendMailError')); }
    finally { setLoading(false); }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();

    try {
      const result =
        mode === 'login'
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });

      if (result.error) {
        setError(result.error.message);
        setLoading(false);
        return;
      }

      if (mode === 'signup' && result.data.session === null) {
        setConfirmationEmail(email);
        setPassword('');
        return;
      }

      router.replace(mode === 'login' ? '/admin' : '/onboarding/step-1');
      router.refresh();
    } catch { setError(t('requestError')); }
    finally { setLoading(false); }
  }

  function toggleMode() {
    setMode((currentMode) => (currentMode === 'login' ? 'signup' : 'login'));
    setError('');
  }

  if (confirmationEmail) return (
    <PublicShell>
        <h1>{t('checkEmail')}</h1>
        <p className="auth-copy">{t('confirmationSent',{email:confirmationEmail})}</p>
        {error ? <p role="alert" className="mb-4 text-sm text-red-600">{error}</p> : null}
        {notice ? <p role="status" className="mb-4 text-sm text-green-600">{notice}</p> : null}
        <button type="button" disabled={loading} onClick={() => void resendConfirmation()} className="button primary full">{loading ? t('loading') : t('resend')}</button>
        <Link href="/login" onClick={() => { setConfirmationEmail(''); setMode('login'); setError(''); }} className="text-link centered">{t('loginAction')}</Link>
    </PublicShell>
  );

  return (
    <PublicShell>
        <h1>
          {mode === 'login' ? t('loginTitle') : t('signupTitle')}
        </h1>
        <p className="auth-copy">
          {mode === 'login' ? t('loginSubtitle') : t('signupSubtitle')}
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="email">
              {t('email')}
            </label>
            <input
              autoComplete="email"
              className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="password">
              {t('password')}
            </label>
            <input
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              id="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>

          {mode === 'login' ? <label className="remember-row"><input type="checkbox" defaultChecked /> <span>{t('rememberMe')}</span></label> : null}

          {error ? (
            <p aria-live="polite" className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <button
            className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
            type="submit"
          >
            {loading ? t('loading') : mode === 'login' ? t('loginAction') : t('signupAction')}
          </button>
        </form>

        {mode === 'login' ? <Link href="/forgot-password" className="text-link centered">{t('forgotPassword')}</Link> : null}

        <button
          className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700"
          disabled={loading}
          onClick={toggleMode}
          type="button"
        >
          {mode === 'login' ? t('signupAction') : t('alreadyRegistered')}
        </button>
    </PublicShell>
  );
}
