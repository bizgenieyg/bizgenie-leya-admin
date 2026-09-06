'use client';

import { type FormEvent, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Восстановление пароля</h1>
        {sent ? <p role="status" className="text-sm text-gray-600">Если такой аккаунт есть, письмо отправлено</p> : (
          <form onSubmit={submit} className="space-y-4">
            <div><label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input id="email" type="email" autoComplete="email" required disabled={loading} value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50">{loading ? 'Загрузка...' : 'Отправить ссылку'}</button>
          </form>
        )}
        <Link href="/login" className="mt-4 block text-center text-sm text-blue-600">Войти</Link>
      </section>
    </main>
  );
}
