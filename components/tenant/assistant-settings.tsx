'use client';

import { type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getOnboardingTenant } from '@/lib/onboarding/tenant';
import { buttonClass, inputClass } from '@/app/onboarding/step-frame';
import {useI18n} from '@/lib/i18n';

const languages = [{ id: 'he', key: 'hebrew' }, { id: 'ru', key: 'russian' }, { id: 'en', key: 'english' }];

export default function AssistantSettings({ onboarding = false }: { onboarding?: boolean }) {
  const {t}=useI18n();
  const router = useRouter();
  const [name, setName] = useState('');
  const [allowedLanguages, setAllowedLanguages] = useState<string[]>([]);
  const [tone, setTone] = useState('');
  const [style, setStyle] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { supabase, tenantId, requireRole } = await getOnboardingTenant();
        const { data, error } = await supabase.from('assistant_profiles')
          .select('assistant_name, allowed_languages, tone, style_profile_md').eq('tenant_id', tenantId).single();
        if (error || !data) throw new Error(t('profileLoadError'));
        if (cancelled) return;
        setName(data.assistant_name ?? '');
        setAllowedLanguages(data.allowed_languages ?? []);
        setTone(data.tone ?? '');
        setStyle(data.style_profile_md ?? '');
        setTenantId(tenantId);
        try { requireRole(['owner', 'admin']); setCanEdit(true); } catch { setCanEdit(false); }
      } catch (error) {
        if (!cancelled) setError(error instanceof Error ? error.message : t('profileLoadError'));
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
    setSaved(false);
    setError('');
    try {
      const { supabase, tenantId: currentTenantId, requireRole } = await getOnboardingTenant();
      requireRole(['owner', 'admin']);
      if (currentTenantId !== tenantId) throw new Error(t('profileSaveError'));
      const { data, error } = await supabase.from('assistant_profiles').update({
        assistant_name: name.trim(), allowed_languages: allowedLanguages,
        tone: tone.trim() || null, style_profile_md: style.trim() || null,
      }).eq('tenant_id', tenantId).select('tenant_id').single();
      if (error || !data) throw new Error(t('profileSaveError'));
      if (onboarding) router.push('/onboarding/step-3');
      else setSaved(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : t('profileSaveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {loading ? <p role="status">{t('loading')}</p> : null}
      {saved ? <p role="status" className="mb-4 text-sm text-green-600">{t('settingsSaved')}</p> : null}
      {!loading && tenantId && !canEdit ? <p className="mb-4 text-sm text-gray-500">{t('readOnly')}</p> : null}
      <form className="space-y-5" onSubmit={handleSubmit}>
        <fieldset className="space-y-5" disabled={loading || saving || !tenantId || !canEdit}>
          <div><label htmlFor="assistant-name" className="text-sm font-medium text-gray-700">{t('assistantName')}</label>
            <input id="assistant-name" className={inputClass} required value={name} onChange={(event) => setName(event.target.value)} /></div>
          <fieldset><legend className="text-sm font-medium text-gray-700">{t('responseLanguages')}</legend>
            <div className="mt-2 flex flex-wrap gap-4">{languages.map(({ id, key }) => (
              <label key={id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allowedLanguages.includes(id)} onChange={(event) => setAllowedLanguages((current) => event.target.checked ? [...current, id] : current.filter((language) => language !== id))} />{t(key)}</label>
            ))}</div>
          </fieldset>
          <div><label htmlFor="tone" className="text-sm font-medium text-gray-700">{t('tone')}</label>
            <input id="tone" className={inputClass} value={tone} onChange={(event) => setTone(event.target.value)} /></div>
          <div><label htmlFor="style" className="text-sm font-medium text-gray-700">{t('answerStyle')}</label>
            <textarea id="style" className={inputClass} rows={4} value={style} onChange={(event) => setStyle(event.target.value)} /></div>
        </fieldset>
        {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
        <div className="flex items-center justify-between gap-4">
          {onboarding ? <Link href="/onboarding/step-1" className="text-sm text-blue-600">{t('back')}</Link> : null}
          <button className={buttonClass} disabled={loading || saving || !tenantId || !canEdit || !name.trim()} type="submit">{saving ? t('saving') : onboarding ? <>{t('next')} <span className="direction-icon">→</span></> : t('save')}</button>
        </div>
      </form>
    </>
  );
}
