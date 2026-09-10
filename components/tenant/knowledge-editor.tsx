'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getOnboardingTenant } from '@/lib/onboarding/tenant';
import { buttonClass, inputClass } from '@/app/onboarding/step-frame';
import {useI18n} from '@/lib/i18n';

type KnowledgeItem = { id: string; question: string | null; answer: string };

export default function KnowledgeEditor({ onboarding = false }: { onboarding?: boolean }) {
  const {t}=useI18n();
  const router = useRouter();
  const questionInput = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { supabase, tenantId, requireRole } = await getOnboardingTenant();
        const { data, error } = await supabase.from('knowledge_items')
          .select('id, question, answer').eq('tenant_id', tenantId).order('created_at').order('id');
        if (error) throw new Error(t('faqLoadError'));
        if (!cancelled) {
          setItems(data ?? []); setTenantId(tenantId);
          try { requireRole(['owner', 'admin']); setCanEdit(true); } catch { setCanEdit(false); }
        }
      } catch (error) {
        if (!cancelled) setError(error instanceof Error ? error.message : t('faqLoadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  function resetForm() { setEditingId(null); setQuestion(''); setAnswer(''); }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !tenantId || !question.trim() || !answer.trim()) return;
    setBusy(true);
    setError('');
    try {
      const { supabase, tenantId: currentTenantId, requireRole } = await getOnboardingTenant();
      requireRole(['owner', 'admin']);
      if (currentTenantId !== tenantId) throw new Error(t('faqSaveError'));
      const values = { question: question.trim(), answer: answer.trim() };
      const query = editingId
        ? supabase.from('knowledge_items').update(values).eq('tenant_id', tenantId).eq('id', editingId)
        : supabase.from('knowledge_items').insert({ ...values, tenant_id: tenantId, type: 'faq', language: 'he', active: true, source: 'manual' });
      const { data, error } = await query.select('id, question, answer').single();
      if (error || !data) throw new Error(t('faqSaveError'));
      setItems((current) => editingId ? current.map((item) => item.id === editingId ? data : item) : [...current, data]);
      resetForm();
    } catch (error) {
      setError(error instanceof Error ? error.message : t('faqSaveError'));
    } finally { setBusy(false); }
  }

  async function removeItem(id: string) {
    if (busy || !tenantId) return;
    setBusy(true);
    setError('');
    try {
      const { supabase, tenantId: currentTenantId, requireRole } = await getOnboardingTenant();
      requireRole(['owner', 'admin']);
      if (currentTenantId !== tenantId) throw new Error(t('faqDeleteError'));
      const { data, error } = await supabase.from('knowledge_items').delete()
        .eq('tenant_id', tenantId).eq('id', id).select('id').single();
      if (error || !data) throw new Error(t('faqDeleteError'));
      setItems((current) => current.filter((item) => item.id !== id));
      if (editingId === id) resetForm();
    } catch (error) {
      setError(error instanceof Error ? error.message : t('faqDeleteError'));
    } finally { setBusy(false); }
  }

  return (
    <>
      {onboarding ? <p className="mb-5 text-sm text-gray-500">{t('faqIntro')}</p> : null}
      {loading ? <p role="status">{t('loading')}</p> : tenantId && !items.length ? <p className="mb-5 text-sm text-gray-500">{onboarding ? t('noQuestions') : t('noQuestionsAtAll')}</p> : null}
      {!loading && canEdit && !items.length && !onboarding ? <button type="button" className="mb-4 text-sm text-blue-600" onClick={() => questionInput.current?.focus()}>{t('addQuestion')}</button> : null}
      {!loading && tenantId && !canEdit ? <p className="mb-4 text-sm text-gray-500">{t('faqReadOnly')}</p> : null}
      <ul className="mb-6 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-gray-200 p-4">
            <p dir="auto" className="whitespace-pre-wrap break-words font-medium">{item.question || t('withoutQuestion')}</p>
            <p dir="auto" className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-600">{item.answer}</p>
            <div className="mt-3 flex gap-4 text-sm">
              <button type="button" disabled={busy || !canEdit} className="text-blue-600 disabled:opacity-50" onClick={() => { setEditingId(item.id); setQuestion(item.question ?? ''); setAnswer(item.answer); questionInput.current?.focus(); }}>{t('edit')}</button>
              <button type="button" disabled={busy || !canEdit} className="text-red-600 disabled:opacity-50" onClick={() => void removeItem(item.id)}>{t('delete')}</button>
            </div>
          </li>
        ))}
      </ul>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <h2 className="font-medium">{editingId ? t('editFaq') : t('newFaq')}</h2>
        <fieldset disabled={loading || busy || !tenantId || !canEdit} className="space-y-4">
          <div><label htmlFor="question" className="text-sm font-medium text-gray-700">{t('question')}</label>
            <input ref={questionInput} dir="auto" id="question" className={inputClass} required value={question} onChange={(event) => setQuestion(event.target.value)} /></div>
          <div><label htmlFor="answer" className="text-sm font-medium text-gray-700">{t('answer')}</label>
            <textarea dir="auto" id="answer" className={inputClass} rows={4} required value={answer} onChange={(event) => setAnswer(event.target.value)} /></div>
          <div className="flex items-center gap-4">
            <button type="submit" className={buttonClass} disabled={!question.trim() || !answer.trim()}>{busy ? t('saving') : editingId ? t('save') : t('add')}</button>
            {editingId ? <button type="button" className="text-sm text-blue-600" onClick={resetForm}>{t('cancel')}</button> : null}
          </div>
        </fieldset>
      </form>
      {error ? <p role="alert" className="mt-4 text-sm text-red-600">{error}</p> : null}
      {onboarding ? <div className="mt-8 flex items-center justify-between gap-4">
        <Link href="/onboarding/step-3" className="text-sm text-blue-600">{t('back')}</Link>
        <button type="button" className={buttonClass} disabled={busy} onClick={() => router.push('/admin')}>{t('finish')}</button>
      </div> : null}
    </>
  );
}
