'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';

const TIERS = [
  { id: 'starter', name: 'Starter', description: 'FAQ + эскалация + отчёт' },
  { id: 'pro', name: 'Pro', description: '+ запись, напоминания, Promises' },
  {
    id: 'trial',
    name: '14 дней триал',
    description: 'Полный Pro на 2 недели',
  },
] as const;

type Tier = (typeof TIERS)[number]['id'];

function trialEndDate(tier: Tier) {
  return tier === 'trial'
    ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    : null;
}

export default function OnboardingStepOnePage() {
  const [ownerName, setOwnerName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [language, setLanguage] = useState('he');
  const [tier, setTier] = useState<Tier>('trial');
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

      const { data: tenantId, error: createError } = await supabase.rpc('create_tenant_with_owner', {
        p_name: ownerName.trim(),
        p_plan: tier,
        p_business_name: businessName.trim(),
        p_language: language,
        p_status: tier === 'trial' ? 'trial' : 'active',
        p_trial_ends_at: trialEndDate(tier),
      });
      if (createError || typeof tenantId !== 'string' || !tenantId) {
        if (process.env.NODE_ENV === 'development') console.error('Tenant creation failed', { code: createError?.code });
        setError('Не удалось создать бизнес. Попробуйте ещё раз.');
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

          <fieldset>
            <legend className="mb-2 block text-sm font-medium text-gray-700">Тариф</legend>
            <div className="space-y-2">
              {TIERS.map((tierOption) => (
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${
                    tier === tierOption.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  key={tierOption.id}
                >
                  <input
                    checked={tier === tierOption.id}
                    disabled={loading}
                    name="tier"
                    onChange={() => setTier(tierOption.id)}
                    type="radio"
                    value={tierOption.id}
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-gray-900">{tierOption.name}</span>
                    <span className="block text-xs text-gray-500">{tierOption.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

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
