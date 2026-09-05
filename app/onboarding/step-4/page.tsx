'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getOnboardingTenant } from '@/lib/onboarding/tenant';
import { buttonClass, inputClass, StepFrame } from '../step-frame';

type KnowledgeItem = { id: string; question: string | null; answer: string };

export default function OnboardingStepFourPage() {
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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { supabase, tenantId } = await getOnboardingTenant();
        const { data, error } = await supabase.from('knowledge_items')
          .select('id, question, answer').eq('tenant_id', tenantId).order('created_at').order('id');
        if (error) throw new Error('Не удалось загрузить FAQ. Обновите страницу.');
        if (!cancelled) { setItems(data ?? []); setTenantId(tenantId); }
      } catch (error) {
        if (!cancelled) setError(error instanceof Error ? error.message : 'Не удалось загрузить FAQ.');
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
      const { supabase, tenantId: currentTenantId } = await getOnboardingTenant();
      if (currentTenantId !== tenantId) throw new Error('Текущий бизнес изменился. Обновите страницу.');
      const values = { question: question.trim(), answer: answer.trim() };
      const query = editingId
        ? supabase.from('knowledge_items').update(values).eq('tenant_id', tenantId).eq('id', editingId)
        : supabase.from('knowledge_items').insert({ ...values, tenant_id: tenantId, type: 'faq', language: 'he', active: true, source: 'manual' });
      const { data, error } = await query.select('id, question, answer').single();
      if (error || !data) throw new Error('Не удалось сохранить FAQ. Попробуйте ещё раз.');
      setItems((current) => editingId ? current.map((item) => item.id === editingId ? data : item) : [...current, data]);
      resetForm();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Не удалось сохранить FAQ.');
    } finally { setBusy(false); }
  }

  async function removeItem(id: string) {
    if (busy || !tenantId) return;
    setBusy(true);
    setError('');
    try {
      const { supabase, tenantId: currentTenantId } = await getOnboardingTenant();
      if (currentTenantId !== tenantId) throw new Error('Текущий бизнес изменился. Обновите страницу.');
      const { data, error } = await supabase.from('knowledge_items').delete()
        .eq('tenant_id', tenantId).eq('id', id).select('id').single();
      if (error || !data) throw new Error('Не удалось удалить FAQ. Попробуйте ещё раз.');
      setItems((current) => current.filter((item) => item.id !== id));
      if (editingId === id) resetForm();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Не удалось удалить FAQ.');
    } finally { setBusy(false); }
  }

  return (
    <StepFrame step={4} title="Добавьте первые FAQ">
      <p className="mb-5 text-sm text-gray-500">Добавьте вопросы и ответы или завершите настройку без FAQ.</p>
      {loading ? <p role="status">Загрузка...</p> : tenantId && !items.length ? <p className="mb-5 text-sm text-gray-500">Пока нет вопросов.</p> : null}
      <ul className="mb-6 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-gray-200 p-4">
            <p dir="auto" className="whitespace-pre-wrap break-words font-medium">{item.question || 'Без вопроса'}</p>
            <p dir="auto" className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-600">{item.answer}</p>
            <div className="mt-3 flex gap-4 text-sm">
              <button type="button" disabled={busy} className="text-blue-600 disabled:opacity-50" onClick={() => { setEditingId(item.id); setQuestion(item.question ?? ''); setAnswer(item.answer); questionInput.current?.focus(); }}>Редактировать</button>
              <button type="button" disabled={busy} className="text-red-600 disabled:opacity-50" onClick={() => void removeItem(item.id)}>Удалить</button>
            </div>
          </li>
        ))}
      </ul>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <h2 className="font-medium">{editingId ? 'Редактировать FAQ' : 'Новый FAQ'}</h2>
        <fieldset disabled={loading || busy || !tenantId} className="space-y-4">
          <div><label htmlFor="question" className="text-sm font-medium text-gray-700">Вопрос</label>
            <input ref={questionInput} dir="auto" id="question" className={inputClass} required value={question} onChange={(event) => setQuestion(event.target.value)} /></div>
          <div><label htmlFor="answer" className="text-sm font-medium text-gray-700">Ответ</label>
            <textarea dir="auto" id="answer" className={inputClass} rows={4} required value={answer} onChange={(event) => setAnswer(event.target.value)} /></div>
          <div className="flex items-center gap-4">
            <button type="submit" className={buttonClass} disabled={!question.trim() || !answer.trim()}>{busy ? 'Сохранение...' : editingId ? 'Сохранить' : 'Добавить'}</button>
            {editingId ? <button type="button" className="text-sm text-blue-600" onClick={resetForm}>Отмена</button> : null}
          </div>
        </fieldset>
      </form>
      {error ? <p role="alert" className="mt-4 text-sm text-red-600">{error}</p> : null}
      <div className="mt-8 flex items-center justify-between gap-4">
        <Link href="/onboarding/step-3" className="text-sm text-blue-600">Назад</Link>
        <button type="button" className={buttonClass} disabled={busy} onClick={() => router.push('/admin')}>Завершить</button>
      </div>
    </StepFrame>
  );
}
