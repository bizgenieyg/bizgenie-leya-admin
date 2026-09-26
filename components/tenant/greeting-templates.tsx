'use client';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Button, ErrorState, LoadingState } from '@/components/ui/primitives';
import { useI18n } from '@/lib/i18n';
import { translatedApiError } from '@/lib/i18n/api-error';
import { useSimulatorDrawer } from '@/lib/tenant/simulator-drawer';

const KEYS = ['client.greeting', 'client.greeting_known'] as const;
const LANGS = ['ru', 'he', 'en'] as const;
type Texts = Record<(typeof KEYS)[number], Record<(typeof LANGS)[number], string>>;
const empty = (): Texts => ({ 'client.greeting': { ru: '', he: '', en: '' }, 'client.greeting_known': { ru: '', he: '', en: '' } });
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

/** Owner-editable greeting replies (sent without the model); empty field = default text. */
export default function GreetingTemplates() {
  const { t } = useI18n();
  const { setDirty } = useSimulatorDrawer();
  const [texts, setTexts] = useState<Texts | null>(null);
  const [defaults, setDefaults] = useState<Texts>(empty());
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    const r = await fetch('/api/tenant-settings', { cache: 'no-store' }), d = await r.json();
    if (!r.ok) throw new Error(translatedApiError(t, d, 'settingsLoadError'));
    const stored = record(d.settings?.greeting_templates), base = record(d.settings?.greeting_template_defaults);
    const next = empty(), def = empty();
    for (const key of KEYS) for (const lang of LANGS) {
      const value = record(stored[key])[lang], fallback = record(base[key])[lang];
      def[key][lang] = typeof fallback === 'string' ? fallback : '';
      next[key][lang] = typeof value === 'string' && value ? value : def[key][lang];
    }
    setDefaults(def); setTexts(next); setSaved(JSON.stringify(next));
  }, [t]);
  useEffect(() => { void load().catch(() => setError(t('settingsLoadError'))); }, [load, t]);
  useEffect(() => { if (texts) setDirty('greetings', JSON.stringify(texts) !== saved); }, [texts, saved, setDirty]);
  useEffect(() => () => setDirty('greetings', false), [setDirty]);
  async function save(event: FormEvent) {
    event.preventDefault(); if (!texts) return;
    setBusy(true); setError(''); setNotice('');
    try {
      // A text equal to the default is stored as "no override", so later default improvements apply.
      const body = Object.fromEntries(KEYS.map(key => [key, Object.fromEntries(LANGS.filter(lang => texts[key][lang].trim() && texts[key][lang].trim() !== defaults[key][lang]).map(lang => [lang, texts[key][lang].trim()]))]));
      const r = await fetch('/api/tenant-settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ greeting_templates: body }) });
      const d = await r.json();
      if (!r.ok) throw new Error(translatedApiError(t, d, 'saveError'));
      await load(); setNotice(t('settingsSaved'));
    } catch (e) { setError(e instanceof Error ? e.message : t('saveError')); }
    finally { setBusy(false); }
  }
  if (!texts) return error ? <ErrorState message={error} onRetry={() => void load()} /> : <LoadingState label={t('loadingSettings')} />;
  return <form className="greeting-templates" onSubmit={save}>
    {error ? <p role="alert" className="error-copy">{error}</p> : null}{notice ? <p role="status" className="success-copy">{notice}</p> : null}
    {KEYS.map(key => <fieldset key={key} className="greeting-template">
      <legend>{t(key === 'client.greeting' ? 'greetingFirstTitle' : 'greetingKnownTitle')}</legend>
      <p className="field-help">{t(key === 'client.greeting' ? 'greetingFirstHelp' : 'greetingKnownHelp')}</p>
      {LANGS.map(lang => <label key={lang} className="field-label">{t(lang === 'ru' ? 'russian' : lang === 'he' ? 'hebrew' : 'english')}
        <textarea className="field-control" dir={lang === 'he' ? 'rtl' : 'ltr'} rows={2} maxLength={300} value={texts[key][lang]}
          onChange={event => setTexts(current => current ? { ...current, [key]: { ...current[key], [lang]: event.target.value } } : current)} />
      </label>)}
      <Button type="button" tone="quiet" disabled={busy} onClick={() => setTexts(current => current ? { ...current, [key]: { ...defaults[key] } } : current)}>{t('greetingReset')}</Button>
    </fieldset>)}
    <Button disabled={busy}>{busy ? t('saving') : t('save')}</Button>
  </form>;
}
