'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';

export default function OnboardingStepOnePage() {
  const [ownerName, setOwnerName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [language, setLanguage] = useState('he');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.replace('/login');
        router.refresh();
        return;
      }

      // Plan is assigned by the system (starter); it is never chosen here.
      const { data: tenantId, error: createError } = await supabase.rpc('create_tenant_with_owner', {
        p_name: ownerName.trim(),
        p_business_name: businessName.trim(),
        p_language: language,
      });
      if (createError || typeof tenantId !== 'string' || !tenantId) {
        if (process.env.NODE_ENV === 'development') console.error('Tenant creation failed', { code: createError?.code });
        setError(
          createError?.code === '54000' || createError?.hint === 'max_tenants_per_owner'
            ? 'К вашему аккаунту уже привязан бизнес. Чтобы добавить ещё один, напишите оператору платформы.'
            : 'Не удалось создать бизнес. Попробуйте ещё раз.',
        );
        return;
      }

      sessionStorage.setItem('onboarding_tenant_id', tenantId);
      router.push('/onboarding/step-2');
    } catch {
      if (process.env.NODE_ENV === 'development') console.error('Tenant creation request failed');
      setError('Не удалось создать бизнес. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <section className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-8">
          <div aria-label="Шаг 1 из 4" className="mb-4 flex gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                className={`h-1 flex-1 rounded-full ${step === 1 ? 'bg-blue-600' : 'bg-gray-200'}`}
                key={step}
              />
            ))}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Расскажите о вашем бизнесе</h1>
          <p className="mt-1 text-sm text-gray-500">Шаг 1 из 4</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium text-gray-700" htmlFor="owner-name">
              Ваше имя
            </label>
            <input
              className="mt-1 w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              id="owner-name"
              onChange={(event) => setOwnerName(event.target.value)}
              placeholder="Анна"
              required
              value={ownerName}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700" htmlFor="business-name">
              Название бизнеса
            </label>
            <input
              className="mt-1 w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              id="business-name"
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder="Студия Анны"
              required
              value={businessName}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700" htmlFor="language">
              Основной язык
            </label>
            <select
              className="mt-1 w-full rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              id="language"
              onChange={(event) => setLanguage(event.target.value)}
              value={language}
            >
              <option value="he">עברית</option>
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </div>

          {error ? (
            <p aria-live="polite" className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <button
            className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!ownerName.trim() || !businessName.trim() || loading}
            type="submit"
          >
            {loading ? 'Сохранение...' : 'Далее →'}
          </button>
        </form>
      </section>
    </main>
  );
}
