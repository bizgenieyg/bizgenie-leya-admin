'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';

type AuthMode = 'login' | 'signup';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();

    const result =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    router.replace(mode === 'login' ? '/admin' : '/onboarding/step-1');
    router.refresh();
  }

  function toggleMode() {
    setMode((currentMode) => (currentMode === 'login' ? 'signup' : 'login'));
    setError('');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          {mode === 'login' ? 'Войти в Лею' : 'Начать бесплатный триал'}
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          {mode === 'login'
            ? 'Войдите в аккаунт специалиста'
            : '14 дней бесплатно. Без кредитной карты.'}
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="email">
              Email
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
              Пароль
            </label>
            <input
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              id="password"
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>

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
            {loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Начать триал'}
          </button>
        </form>

        <button
          className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700"
          disabled={loading}
          onClick={toggleMode}
          type="button"
        >
          {mode === 'login' ? 'Нет аккаунта? Начать триал' : 'Уже есть аккаунт? Войти'}
        </button>
      </section>
    </main>
  );
}
