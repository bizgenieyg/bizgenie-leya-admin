'use client';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Button, ErrorState, LoadingState } from '@/components/ui/primitives';
import { useI18n } from '@/lib/i18n';
import { translatedApiError } from '@/lib/i18n/api-error';
import { useSimulatorDrawer } from '@/lib/tenant/simulator-drawer';

const MAX_QUESTIONS = 10, MAX_CHARS = 200;

/** Owner-editable list of what Leya gently finds out from clients; starts from a set matching the business sector. */
export default function DiscoveryQuestions() {
  const { t } = useI18n();
  const [items, setItems] = useState<string[] | null>(null);
  const [saved, setSaved] = useState('');
  const { setDirty } = useSimulatorDrawer();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    const r = await fetch('/api/tenant-settings', { cache: 'no-store' }), d = await r.json();
    if (!r.ok) throw new Error(translatedApiError(t, d, 'settingsLoadError'));
    const list = Array.isArray(d.settings?.client_discovery_questions) ? d.settings.client_discovery_questions.filter((q: unknown) => typeof q === 'string') : [];
    setItems(list.length ? list : ['']);
    setSaved(JSON.stringify(list));
  }, [t]);
  useEffect(() => { void load().catch(() => setError(t('settingsLoadError'))); }, [load, t]);
  useEffect(() => { if (items) setDirty('discovery', JSON.stringify(items.map(q => q.trim()).filter(Boolean)) !== saved); }, [items, saved, setDirty]);
  useEffect(() => () => setDirty('discovery', false), [setDirty]);
  async function save(event: FormEvent) {
    event.preventDefault(); if (!items) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const questions = items.map(q => q.trim()).filter(Boolean).slice(0, MAX_QUESTIONS);
      const r = await fetch('/api/tenant-settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_discovery_questions: questions }) });
      const d = await r.json();
      if (!r.ok) throw new Error(translatedApiError(t, d, 'saveError'));
      await load(); setNotice(t('settingsSaved'));
    } catch (e) { setError(e instanceof Error ? e.message : t('saveError')); }
    finally { setBusy(false); }
  }
  if (!items) return error ? <ErrorState message={error} onRetry={() => void load()} /> : <LoadingState label={t('loadingSettings')} />;
  return <form className="discovery-questions" onSubmit={save}>
    {error ? <p role="alert" className="error-copy">{error}</p> : null}{notice ? <p role="status" className="success-copy">{notice}</p> : null}
    <ol>{items.map((value, index) => <li key={index} className="field-action-row">
      <input className="field-control" dir="auto" aria-label={`${t('discoveryTitle')} ${index + 1}`} maxLength={MAX_CHARS} value={value}
        placeholder={t('discoveryPlaceholder')} onChange={event => setItems(list => list!.map((q, i) => i === index ? event.target.value : q))} />
      <Button type="button" tone="quiet" aria-label={t('discoveryRemove')} disabled={busy || items.length === 1}
        onClick={() => setItems(list => list!.filter((_, i) => i !== index))}>×</Button>
    </li>)}</ol>
    <div className="row-actions">
      <Button type="button" tone="secondary" disabled={busy || items.length >= MAX_QUESTIONS} onClick={() => setItems(list => [...list!, ''])}>{t('discoveryAdd')}</Button>
      <Button disabled={busy}>{busy ? t('saving') : t('save')}</Button>
    </div>
  </form>;
}
