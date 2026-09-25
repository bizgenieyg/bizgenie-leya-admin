'use client';

import { type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getOnboardingTenant } from '@/lib/onboarding/tenant';
import {useI18n} from '@/lib/i18n';
import {Button,Check,Select} from '@/components/ui/primitives';
import {useSimulatorDrawer} from '@/lib/tenant/simulator-drawer';

const languages = [{ id: 'he', key: 'hebrew' }, { id: 'ru', key: 'russian' }, { id: 'en', key: 'english' }];
const tones=[
  {id:'friendly_professional',label:'toneFriendlyProfessional',help:'toneFriendlyProfessionalHelp',example:'toneFriendlyProfessionalExample'},
  {id:'warm_conversational',label:'toneWarmConversational',help:'toneWarmConversationalHelp',example:'toneWarmConversationalExample'},
  {id:'concise_direct',label:'toneConciseDirect',help:'toneConciseDirectHelp',example:'toneConciseDirectExample'},
  {id:'formal_respectful',label:'toneFormalRespectful',help:'toneFormalRespectfulHelp',example:'toneFormalRespectfulExample'},
] as const;

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
  const [snapshot, setSnapshot] = useState('');
  const {setDirty} = useSimulatorDrawer();

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
        setTone(tones.some(item=>item.id===data.tone) ? data.tone : 'friendly_professional');
        setStyle(data.style_profile_md ?? '');
        setTenantId(tenantId);
        setSnapshot(JSON.stringify({name: data.assistant_name ?? '', allowedLanguages: data.allowed_languages ?? [], tone: data.tone ?? '', style: data.style_profile_md ?? ''}));
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
    setDirty('assistant', JSON.stringify({name, allowedLanguages, tone, style}) !== snapshot);
  }, [name, allowedLanguages, tone, style, snapshot, loading, setDirty]);
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
        assistant_name: name.trim(), allowed_languages: allowedLanguages,
        tone: tone.trim() || null, style_profile_md: style.trim() || null,
      }).eq('tenant_id', tenantId).select('tenant_id').single();
      if (error || !data) throw new Error(t('profileSaveError'));
      setSnapshot(JSON.stringify({name: name.trim(), allowedLanguages, tone, style}));
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
      {loading ? <p role="status">{t('loading')}</p> : null}
      {saved ? <p role="status" className="mb-4 text-sm success-copy">{t('settingsSaved')}</p> : null}
      {!loading && tenantId && !canEdit ? <p className="mb-4 text-sm muted">{t('readOnly')}</p> : null}
      <form className="compact-form" onSubmit={handleSubmit}>
        <fieldset className="compact-form" disabled={loading || saving || !tenantId || !canEdit}>
          <label htmlFor="assistant-name" className="field-label">{t('assistantName')}<input id="assistant-name" className="field-control" required value={name} onChange={(event) => setName(event.target.value)} /></label>
          <fieldset className="field-group"><legend className="field-label">{t('responseLanguages')}</legend><div className="check-grid">{languages.map(({ id, key }) => <Check key={id} label={t(key)} checked={allowedLanguages.includes(id)} onChange={checked=>setAllowedLanguages(current=>checked?[...current,id]:current.filter(language=>language!==id))}/>)}</div></fieldset>
          <label htmlFor="tone" className="field-label">{t('tone')}<Select id="tone" className="field-control" value={tone} onChange={(event) => changeTone(event.target.value)}>{tones.map(item=><option key={item.id} value={item.id}>{t(item.label)}</option>)}</Select><span className="field-help">{t(tones.find(item=>item.id===tone)?.help??'toneFriendlyProfessionalHelp')}</span></label>
          <div className="tone-preview"><span>{t('tonePreview')}</span><p>{toneExample}</p></div><label htmlFor="style" className="field-label">{t('answerStyle')}<span className="field-help">{t('answerStyleHelp')}</span><textarea id="style" className="field-control" rows={3} placeholder={toneExample} value={style} onChange={(event) => setStyle(event.target.value)} /></label>
        </fieldset>
        {error ? <p role="alert" className="text-sm error-copy">{error}</p> : null}
        <div className="flex items-center justify-between gap-4">
          {onboarding ? <Link href="/onboarding/step-1" className="text-sm text-link-inline">{t('back')}</Link> : null}
          <Button disabled={loading || saving || !tenantId || !canEdit || !name.trim()} type="submit">{saving ? t('saving') : onboarding ? <>{t('next')} <span className="direction-icon">→</span></> : t('save')}</Button>
        </div>
      </form>
    </>
  );
}
