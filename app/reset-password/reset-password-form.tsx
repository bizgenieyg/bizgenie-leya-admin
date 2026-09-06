'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError('');
    if (password !== repeat) { setError('Пароли не совпадают.'); return; }
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
          setError(minimum ? `Пароль должен содержать не менее ${minimum} символов.` : 'Пароль не соответствует требованиям безопасности. Используйте более длинный и сложный пароль.');
        } else if (error.code === 'same_password') setError('Новый пароль должен отличаться от текущего.');
        else setError('Не удалось изменить пароль. Запросите новую ссылку и попробуйте ещё раз.');
        return;
      }
      setPassword('');
      setRepeat('');
      router.replace('/onboarding/step-1');
      router.refresh();
    } catch { setError('Не удалось изменить пароль. Попробуйте ещё раз.'); }
    finally { setLoading(false); }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Новый пароль</h1>
        <form onSubmit={submit} className="space-y-4">
          <div><label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">Пароль</label>
            <input id="password" type="password" autoComplete="new-password" required disabled={loading} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label htmlFor="repeat-password" className="mb-1 block text-sm font-medium text-gray-700">Повторите пароль</label>
            <input id="repeat-password" type="password" autoComplete="new-password" required disabled={loading} value={repeat} onChange={(event) => setRepeat(event.target.value)} className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
          {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50">{loading ? 'Загрузка...' : 'Сохранить пароль'}</button>
        </form>
      </section>
    </main>
  );
}
