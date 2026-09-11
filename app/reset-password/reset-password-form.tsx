'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {useI18n} from '@/lib/i18n';
import PublicShell from '@/components/ui/public-shell';

export default function ResetPasswordForm() {
  const {t}=useI18n();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError('');
    if (password !== repeat) { setError(t('passwordMismatch')); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { router.replace('/login'); return; }
      // Supabase enforces the project's actual password policy, including its minimum length.
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        if (error.code === 'weak_password') {
          const minimum = error.message.match(/at least (\d+) characters/i)?.[1];
          setError(minimum ? t('passwordMinimum',{count:minimum}) : t('weakPassword'));
        } else if (error.code === 'same_password') setError(t('samePassword'));
        else setError(t('passwordChangeError'));
        return;
      }
      setPassword('');
      setRepeat('');
      router.replace('/onboarding/step-1');
      router.refresh();
    } catch { setError(t('passwordChangeError')); }
    finally { setLoading(false); }
  }

  return (
    <PublicShell>
        <h1>{t('newPassword')}</h1>
        <form onSubmit={submit} className="space-y-4">
          <div><label htmlFor="password" className="field-label">{t('password')}</label>
            <input id="password" type="password" autoComplete="new-password" required disabled={loading} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label htmlFor="repeat-password" className="field-label">{t('repeatPassword')}</label>
            <input id="repeat-password" type="password" autoComplete="new-password" required disabled={loading} value={repeat} onChange={(event) => setRepeat(event.target.value)} className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
          {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
          <button type="submit" disabled={loading} className="button primary full">{loading ? t('loading') : t('savePassword')}</button>
        </form>
    </PublicShell>
  );
}
