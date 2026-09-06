'use client';

import { type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getOnboardingTenant } from '@/lib/onboarding/tenant';
import { buttonClass, inputClass, StepFrame } from '../step-frame';

const languages = [{ id: 'he', label: 'עברית' }, { id: 'ru', label: 'Русский' }, { id: 'en', label: 'English' }];

export default function OnboardingStepTwoPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [allowedLanguages, setAllowedLanguages] = useState<string[]>([]);
  const [tone, setTone] = useState('');
  const [style, setStyle] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { supabase, tenantId } = await getOnboardingTenant();
        const { data, error } = await supabase.from('assistant_profiles')
          .select('assistant_name, allowed_languages, tone, style_profile_md').eq('tenant_id', tenantId).single();
        if (error || !data) throw new Error('Не удалось загрузить профиль помощника. Проверьте завершение шага 1 и обновите страницу.');
        if (cancelled) return;
        setName(data.assistant_name ?? '');
        setAllowedLanguages(data.allowed_languages ?? []);
        setTone(data.tone ?? '');
        setStyle(data.style_profile_md ?? '');
        setTenantId(tenantId);
      } catch (error) {
        if (!cancelled) setError(error instanceof Error ? error.message : 'Не удалось загрузить профиль.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !tenantId || !name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const { supabase, tenantId: currentTenantId, requireRole } = await getOnboardingTenant();
      requireRole(['owner', 'admin']);
      if (currentTenantId !== tenantId) throw new Error('Текущий бизнес изменился. Обновите страницу.');
      const { data, error } = await supabase.from('assistant_profiles').update({
        assistant_name: name.trim(), allowed_languages: allowedLanguages,
        tone: tone.trim() || null, style_profile_md: style.trim() || null,
      }).eq('tenant_id', tenantId).select('tenant_id').single();
      if (error || !data) throw new Error('Не удалось сохранить профиль помощника. Попробуйте ещё раз.');
      router.push('/onboarding/step-3');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Не удалось сохранить профиль.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <StepFrame step={2} title="Настройте помощника">
      {loading ? <p role="status">Загрузка...</p> : null}
      <form className="space-y-5" onSubmit={handleSubmit}>
        <fieldset className="space-y-5" disabled={loading || saving || !tenantId}>
          <div><label htmlFor="assistant-name" className="text-sm font-medium text-gray-700">Имя помощника</label>
            <input id="assistant-name" className={inputClass} required value={name} onChange={(event) => setName(event.target.value)} /></div>
          <fieldset><legend className="text-sm font-medium text-gray-700">Языки ответов</legend>
            <div className="mt-2 flex flex-wrap gap-4">{languages.map(({ id, label }) => (
              <label key={id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allowedLanguages.includes(id)} onChange={(event) => setAllowedLanguages((current) => event.target.checked ? [...current, id] : current.filter((language) => language !== id))} />{label}</label>
            ))}</div>
          </fieldset>
          <div><label htmlFor="tone" className="text-sm font-medium text-gray-700">Тон общения</label>
            <input id="tone" className={inputClass} value={tone} onChange={(event) => setTone(event.target.value)} /></div>
          <div><label htmlFor="style" className="text-sm font-medium text-gray-700">Стиль ответов</label>
            <textarea id="style" className={inputClass} rows={4} value={style} onChange={(event) => setStyle(event.target.value)} /></div>
        </fieldset>
        {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
        <div className="flex items-center justify-between gap-4">
          <Link href="/onboarding/step-1" className="text-sm text-blue-600">Назад</Link>
          <button className={buttonClass} disabled={loading || saving || !tenantId || !name.trim()} type="submit">{saving ? 'Сохранение...' : 'Далее →'}</button>
        </div>
      </form>
    </StepFrame>
  );
}
