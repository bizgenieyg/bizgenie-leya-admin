'use client';
import {RuleFlow} from './owner-rules';
import { type FormEvent, useState } from 'react';
import { Button, EmptyState, ErrorState } from '@/components/ui/primitives';
import { useFormat, useI18n } from '@/lib/i18n';
import { useAssistantName } from '@/lib/tenant/assistant-name';

type Message = { role: 'owner' | 'leya'; text: string; at: Date; notices?: string[]; awaitingOwner?: boolean };
type SimulatorResponse = {
  reply: string | null;
  outcome: 'answered' | 'escalated' | 'limit' | 'paused';
  quietHours?: { active: true; until: string };
  pausedNote?: true;
};

/** Z6: `suggestions` — three typical client questions of the tenant's deal type, plus «Свой вопрос» (focuses the input). */
export default function ConversationSimulator({ dirtyWarning = false, suggestions = [] }: { dirtyWarning?: boolean; suggestions?: string[] } = {}) {
  const { t } = useI18n();
  const format = useFormat();
  const assistantName = useAssistantName() ?? t('leyaResponder');
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ownerAnswer, setOwnerAnswer] = useState('');
  const [sessionId, setSessionId] = useState(()=>crypto.randomUUID());
  // Z11: «Исправить» under an assistant reply — which one is being corrected, and «Спросить ещё раз» after saving.
  const [correcting, setCorrecting] = useState<number | null>(null);
  const [corrected, setCorrected] = useState<{ index: number; reply: string } | null>(null);
  const clear = () => { setCorrecting(null); setCorrected(null); setMessages([]); setText(''); setOwnerAnswer(''); setError(''); setSessionId(crypto.randomUUID()); };

  async function send(event: FormEvent) {
    event.preventDefault();
    await sendText(text.trim());
  }
  async function sendText(value: string) {
    if (!value || busy) return;
    setMessages(rows => [...rows.map(row => ({ ...row, awaitingOwner: false })), { role: 'owner', text: value, at: new Date() }]);
    setText(''); setBusy(true); setError('');
    try {
      const response = await fetch('/api/simulator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({text:value,sessionId}) });
      const json = await response.json();
      if (!response.ok) {
        const code = typeof json?.code === 'string' ? json.code : '';
        setError(t(['simulatorLimitError', 'simulatorProcessingError', 'simulatorInvalidMessage', 'serviceUnavailable'].includes(code) ? code : 'simulatorError'));
        return;
      }
      const result = json as SimulatorResponse;
      if (result.reply !== null && typeof result.reply !== 'string') throw new Error('Invalid simulator reply');
      const notices: string[] = [];
      if (result.outcome === 'escalated') notices.push(t('simulatorEscalatedNote'));
      if (result.quietHours?.active) notices.push(t('simulatorQuietHoursNote', { time: format.time(result.quietHours.until) }));
      if (result.pausedNote) notices.push(t('simulatorPausedNote'));
      if (result.outcome === 'limit') notices.push(t('simulatorTariffLimitNote'));
      if (result.outcome === 'paused') notices.push(t('simulatorPausedNoReply'));
      setMessages(rows => [...rows.map(row => ({ ...row, awaitingOwner: false })), { role: 'leya', text: result.reply ?? '', at: new Date(), notices, awaitingOwner: result.outcome === 'escalated' }]);
    } catch { setError(t('simulatorError')); }
    finally { setBusy(false); }
  }

  async function answerAsOwner(event: FormEvent) {
    event.preventDefault();
    const value = ownerAnswer.trim();
    if (!value || busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/simulator/owner-answer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer: value, sessionId }) });
      const json = await response.json();
      if (!response.ok) {
        const code = typeof json?.code === 'string' ? json.code : '';
        setError(t(['simulatorLimitError', 'simulatorProcessingError', 'simulatorInvalidMessage', 'simulatorNoQuestion', 'serviceUnavailable'].includes(code) ? code : 'simulatorError'));
        return;
      }
      if (typeof json?.reply !== 'string') throw new Error('Invalid simulator reply');
      setOwnerAnswer('');
      setMessages(rows => [...rows.map(row => ({ ...row, awaitingOwner: false })), { role: 'leya', text: json.reply, at: new Date(), notices: [t('simulatorOwnerAnswerNote')] }]);
    } catch { setError(t('simulatorError')); }
    finally { setBusy(false); }
  }

  return <section id="simulator" className="surface-card simulator" aria-labelledby="simulator-title">
    <div className="section-heading"><div><p className="card-kicker">{t('simulatorKicker')}</p><h2 id="simulator-title">{t('simulatorTitle')}</h2><p>{t('simulatorHelp')}</p></div><div className="simulator-heading-actions"><span className="simulation-badge">{t('simulationOnly')}</span>{messages.length ? <Button type="button" tone="quiet" disabled={busy} onClick={clear}>{t('simulatorClear')}</Button> : null}</div></div>
    <div className="simulator-chat" aria-live="polite">{messages.length === 0 ? <EmptyState title={t('simulatorEmpty')} action={<p>{t('simulatorEmptyHelp')}</p>} /> : messages.map((message, index) => <div key={`${message.at.toISOString()}-${index}`} className={`chat-bubble ${message.role}`}>
      {message.role === 'leya' ? <b className="chat-sender" dir="auto">{assistantName}</b> : null}
      {message.text ? <p dir="auto">{message.text}</p> : null}
      {message.notices?.map((notice, noticeIndex) => <p className="simulator-note" key={noticeIndex}>{notice}</p>)}
      <small>{format.time(message.at)}</small>
      {message.role === 'leya' && message.text && !busy ? (() => {
        // The client message this reply answered: the last owner-side (client) bubble before it.
        const asked = [...messages.slice(0, index)].reverse().find(row => row.role === 'owner')?.text ?? '';
        if (corrected?.index === index) return <div className="simulator-correct" role="status"><p dir="auto">{corrected.reply}</p>{asked ? <Button type="button" tone="secondary" className="small" onClick={() => { setCorrected(null); void sendText(asked); }}>{t('simulatorAskAgain')}</Button> : null}</div>;
        if (correcting === index) return <div className="simulator-correct"><p className="field-label">{t('simulatorCorrectQuestion')}</p>
          <RuleFlow placeholder={t('simulatorCorrectPlaceholder')} context={`Клиент написал: ${asked}\nАссистент ответил: ${message.text}\nВладелец объясняет, как надо было ответить.`} onCancel={() => setCorrecting(null)} onSaved={reply => { setCorrecting(null); setCorrected({ index, reply }); }}/></div>;
        return <button type="button" className="text-link-inline simulator-correct-link" onClick={() => { setCorrected(null); setCorrecting(index); }}>{t('simulatorCorrect')}</button>;
      })() : null}
      {message.awaitingOwner ? <form className="simulator-owner-answer" onSubmit={answerAsOwner}><label className="field-label" htmlFor={`simulator-owner-answer-${index}`}>{t('simulatorOwnerAnswerLabel')}</label><div className="field-action-row"><input id={`simulator-owner-answer-${index}`} dir="auto" value={ownerAnswer} onChange={event => setOwnerAnswer(event.target.value)} maxLength={2000} placeholder={t('simulatorOwnerAnswerPlaceholder')} /><Button disabled={busy || !ownerAnswer.trim()}>{t('simulatorOwnerAnswerSend')}</Button></div></form> : null}
    </div>)}{busy ? <div className="chat-bubble leya typing"><span/><span/><span/><i>{t('simulatorThinking', { name: assistantName })}</i></div> : null}</div>
    {error ? <ErrorState message={error} /> : null}
    {dirtyWarning ? <p className="simulator-dirty-warning" role="status">{t('simulatorDirtyWarning')}</p> : null}
    {suggestions.length ? <div className="preset-grid simulator-suggestions" aria-label={t('simulatorSuggestions')}>
      {suggestions.map(question => <button key={question} type="button" className="preset-card" dir="auto" disabled={busy} onClick={() => void sendText(question)}>{question}</button>)}
      <button type="button" className="preset-card" onClick={() => document.getElementById('simulation-message')?.focus()}>{t('simulatorOwnQuestion')}</button>
    </div> : null}
    <form className="simulator-compose field-action-row" onSubmit={send}><label className="sr-only" htmlFor="simulation-message">{t('simulatorPlaceholder')}</label><input id="simulation-message" dir="auto" value={text} onChange={event => setText(event.target.value)} maxLength={2000} placeholder={t('simulatorPlaceholder')} /><Button disabled={busy || !text.trim()}>{t('simulatorSend')}</Button></form>
  </section>;
}
