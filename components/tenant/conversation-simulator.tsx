'use client';
import { type FormEvent, useState } from 'react';
import { Button, EmptyState, ErrorState } from '@/components/ui/primitives';
import { useFormat, useI18n } from '@/lib/i18n';

type Message = { role: 'owner' | 'leya'; text: string; at: Date; notices?: string[]; awaitingOwner?: boolean };
type SimulatorResponse = {
  reply: string | null;
  outcome: 'answered' | 'escalated' | 'limit' | 'paused';
  quietHours?: { active: true; until: string };
  pausedNote?: true;
};

export default function ConversationSimulator({ dirtyWarning = false }: { dirtyWarning?: boolean } = {}) {
  const { t } = useI18n();
  const format = useFormat();
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ownerAnswer, setOwnerAnswer] = useState('');
  const [sessionId, setSessionId] = useState(()=>crypto.randomUUID());
  const clear = () => { setMessages([]); setText(''); setOwnerAnswer(''); setError(''); setSessionId(crypto.randomUUID()); };

  async function send(event: FormEvent) {
    event.preventDefault();
    const value = text.trim();
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
      {message.text ? <p dir="auto">{message.text}</p> : null}
      {message.notices?.map((notice, noticeIndex) => <p className="simulator-note" key={noticeIndex}>{notice}</p>)}
      <small>{format.time(message.at)}</small>
      {message.awaitingOwner ? <form className="simulator-owner-answer" onSubmit={answerAsOwner}><label className="field-label" htmlFor={`simulator-owner-answer-${index}`}>{t('simulatorOwnerAnswerLabel')}</label><div className="field-action-row"><input id={`simulator-owner-answer-${index}`} dir="auto" value={ownerAnswer} onChange={event => setOwnerAnswer(event.target.value)} maxLength={2000} placeholder={t('simulatorOwnerAnswerPlaceholder')} /><Button disabled={busy || !ownerAnswer.trim()}>{t('simulatorOwnerAnswerSend')}</Button></div></form> : null}
    </div>)}{busy ? <div className="chat-bubble leya typing"><span/><span/><span/><i>{t('simulatorThinking')}</i></div> : null}</div>
    {error ? <ErrorState message={error} /> : null}
    {dirtyWarning ? <p className="simulator-dirty-warning" role="status">{t('simulatorDirtyWarning')}</p> : null}
    <form className="simulator-compose field-action-row" onSubmit={send}><label className="sr-only" htmlFor="simulation-message">{t('simulatorPlaceholder')}</label><input id="simulation-message" dir="auto" value={text} onChange={event => setText(event.target.value)} maxLength={2000} placeholder={t('simulatorPlaceholder')} /><Button disabled={busy || !text.trim()}>{t('simulatorSend')}</Button></form>
  </section>;
}
