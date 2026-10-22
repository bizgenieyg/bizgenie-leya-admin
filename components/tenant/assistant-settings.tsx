'use client';

import { type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getOnboardingTenant } from '@/lib/onboarding/tenant';
import {useI18n} from '@/lib/i18n';
import {Button,Select} from '@/components/ui/primitives';
import {useSimulatorDrawer} from '@/lib/tenant/simulator-drawer';
import {ASSISTANT_NAME_EVENT} from '@/lib/tenant/assistant-name';

/** Z8: the language the assistant writes to the owner in (owner_language); clients get the language of their message. */
const ownerLanguages = [{ id: 'he', key: 'hebrew' }, { id: 'ru', key: 'russian' }, { id: 'en', key: 'english' }];
const tones=[
  {id:'friendly_professional',label:'toneFriendlyProfessional',help:'toneFriendlyProfessionalHelp',example:'toneFriendlyProfessionalExample'},
  {id:'warm_conversational',label:'toneWarmConversational',help:'toneWarmConversationalHelp',example:'toneWarmConversationalExample'},
  {id:'concise_direct',label:'toneConciseDirect',help:'toneConciseDirectHelp',example:'toneConciseDirectExample'},
  {id:'formal_respectful',label:'toneFormalRespectful',help:'toneFormalRespectfulHelp',example:'toneFormalRespectfulExample'},
] as const;

/**
 * `hideStyle` (Z6): tone and answer style are not shown when replies go by an instruction (they would not apply).
 * Z8 «Настройки → Ассистент»: the name (as the assistant introduces itself) and `ownerLanguage` — given by the page
 * that loaded the settings, saved to owner_language. «Языки ответов» (allowed_languages) is not shown: on the
 * instruction path clients get the language of their last message; the stored value is left as is.
 */
/** `styleOnly` (Z9, «Настройки → Ассистент» of a tenant without an instruction): tone and style with their own save; the name is in the save bar. */
export default function AssistantSettings({ onboarding = false, hideStyle = false, styleOnly = false, ownerLanguage }: { onboarding?: boolean; hideStyle?: boolean; styleOnly?: boolean; ownerLanguage?: string }) {
  const {t}=useI18n();
  const router = useRouter();
  const [name, setName] = useState('');
  const [language, setLanguage] = useState(ownerLanguage ?? '');
  const [savedLanguage, setSavedLanguage] = useState(ownerLanguage ?? '');
  const [tone, setTone] = useState('');
  const [style, setStyle] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [snapshot, setSnapshot] = useState('');
  const {setDirty} = useSimulatorDrawer();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { supabase, tenantId, requireRole } = await getOnboardingTenant();
        const { data, error } = await supabase.from('assistant_profiles')
          .select('assistant_name, tone, style_profile_md').eq('tenant_id', tenantId).single();
        if (error || !data) throw new Error(t('profileLoadError'));
        if (cancelled) return;
        setName(data.assistant_name ?? '');
        setTone(tones.some(item=>item.id===data.tone) ? data.tone : 'friendly_professional');
        setStyle(data.style_profile_md ?? '');
        setTenantId(tenantId);
        setSnapshot(JSON.stringify({name: data.assistant_name ?? '', tone: data.tone ?? '', style: data.style_profile_md ?? ''}));
        try { requireRole(['owner', 'admin']); setCanEdit(true); } catch { setCanEdit(false); }
      } catch {
        if (!cancelled) setError(t('profileLoadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [t]);

  useEffect(() => {
    if (loading || !snapshot) return;
    setDirty('assistant', JSON.stringify({name, tone, style}) !== snapshot);
  }, [name, tone, style, snapshot, loading, setDirty]);
  useEffect(() => () => setDirty('assistant', false), [setDirty]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) { setError(t('readOnly')); return; }
    if (saving || !tenantId || !name.trim()) return;
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const { supabase, tenantId: currentTenantId, requireRole } = await getOnboardingTenant();
      requireRole(['owner', 'admin']);
      if (currentTenantId !== tenantId) throw new Error(t('profileSaveError'));
      const { data, error } = await supabase.from('assistant_profiles').update({
        ...(styleOnly ? {} : { assistant_name: name.trim() }),
        ...(hideStyle ? {} : { tone: tone.trim() || null, style_profile_md: style.trim() || null }),
      }).eq('tenant_id', tenantId).select('tenant_id').single();
      if (error || !data) throw new Error(t('profileSaveError'));
      if (ownerLanguage !== undefined && language && language !== savedLanguage) {
        const response = await fetch('/api/tenant-settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ owner_language: language }) });
        if (!response.ok) throw new Error(t('profileSaveError'));
        setSavedLanguage(language);
      }
      setSnapshot(JSON.stringify({name: name.trim(), tone, style}));
      // The menu («Что знает {имя}») follows the new name without a reload.
      if (!styleOnly && typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') window.dispatchEvent(new CustomEvent(ASSISTANT_NAME_EVENT, { detail: name.trim() }));
      if (onboarding) router.push('/onboarding/step-3');
      else setSaved(true);
    } catch {
      setError(t('profileSaveError'));
    } finally {
      setSaving(false);
    }
  }

  const selectedTone=tones.find(item=>item.id===tone)??tones[0];
  const toneExample=t(selectedTone.example);
  function changeTone(next:string){setTone(next);}
  return (
    <>
      {loading ? <p role="status" className={onboarding ? undefined : 'sr-only'}>{t('loading')}</p> : null}
      {saved ? <p role="status" className="mb-4 text-sm success-copy">{t('settingsSaved')}</p> : null}
      {!loading && tenantId && !canEdit ? <p className="mb-4 text-sm muted">{t('readOnly')}</p> : null}
      <form className="compact-form" onSubmit={handleSubmit}>
        <fieldset className="compact-form" disabled={loading || saving || !tenantId || !canEdit}>
          {styleOnly ? null : <label htmlFor="assistant-name" className="field-label">{t('assistantName')}<span className="field-help">{t('assistantNameHelp')}</span><input id="assistant-name" className="field-control" dir="auto" required maxLength={60} value={name} onChange={(event) => setName(event.target.value)} /></label>}
          {ownerLanguage !== undefined ? <label htmlFor="owner-language" className="field-label">{t('ownerLanguage')}<span className="field-help">{t('ownerLanguageHelp')}</span><Select id="owner-language" className="field-control" value={language} onChange={(event) => setLanguage(event.target.value)}>{ownerLanguages.map(({ id, key }) => <option key={id} value={id}>{t(key)}</option>)}</Select></label> : null}
          {hideStyle?null:<><label htmlFor="tone" className="field-label">{t('tone')}<Select id="tone" className="field-control" value={tone} onChange={(event) => changeTone(event.target.value)}>{tones.map(item=><option key={item.id} value={item.id}>{t(item.label)}</option>)}</Select><span className="field-help">{t(tones.find(item=>item.id===tone)?.help??'toneFriendlyProfessionalHelp')}</span></label>
          <div className="tone-preview"><span>{t('tonePreview')}</span><p>{toneExample}</p></div><label htmlFor="style" className="field-label">{t('answerStyle')}<span className="field-help">{t('answerStyleHelp')}</span><textarea id="style" className="field-control" rows={3} placeholder={toneExample} value={style} onChange={(event) => setStyle(event.target.value)} /></label></>}
        </fieldset>
        {error ? <p role="alert" className="text-sm error-copy">{error}</p> : null}
        <div className="flex items-center justify-between gap-4">
          {onboarding ? <Link href="/onboarding/step-1" className="text-sm text-link-inline">{t('back')}</Link> : null}
          <Button tone={onboarding ? 'primary' : 'secondary'} disabled={loading || saving || !tenantId || !canEdit || !name.trim()} type="submit">{saving ? t('saving') : onboarding ? <>{t('next')} <span className="direction-icon">→</span></> : t('save')}</Button>
        </div>
      </form>
    </>
  );
}
