'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { beginSession, requestSession, isConnected, shouldPoll, statusLabel, actionLabel, backendUnavailable, type SessionState } from '@/lib/waha/connection';
import { buttonClass } from '@/app/onboarding/step-frame';

export default function WhatsAppConnection({ cabinet = false, canEdit = true }: { cabinet?: boolean; canEdit?: boolean }) {
  const [state, setState] = useState<SessionState>({ status: '', qrAvailable: false });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [expired, setExpired] = useState(false);
  const [qrTimestamp, setQrTimestamp] = useState(0);
  const [qrError, setQrError] = useState(false);
  const [attempt, setAttempt] = useState<{ mode: 'read' | 'connect' | 'disconnect' }>({ mode: 'read' });
  const active = useRef<AbortController | null>(null);
  const scanning = state.status === 'SCAN_QR_CODE' && state.qrAvailable && !expired && canEdit;

  useEffect(() => {
    const controller = new AbortController();
    active.current = controller;
    let inFlight = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      controller.abort();
      clearInterval(interval);
      setExpired(true);
      setError('');
      setBusy(false);
    }, 180000);
    setExpired(false);
    setError('');
    setBusy(true);

    function accept(next: SessionState) {
      setState(next);
      setError('');
      if (!shouldPoll(next.status)) {
        clearInterval(interval);
        clearTimeout(timeout);
        return false;
      }
      return true;
    }
    async function poll() {
      if (inFlight || controller.signal.aborted) return;
      inFlight = true;
      try {
        const next = await requestSession('/api/waha/status', controller.signal);
        if (!controller.signal.aborted) accept(next);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : backendUnavailable);
      } finally { inFlight = false; }
    }
    async function start() {
      try {
        const next = attempt.mode === 'connect'
          ? await beginSession(controller.signal, true)
          : await requestSession(attempt.mode === 'disconnect' ? '/api/waha/disconnect' : '/api/waha/status', controller.signal, attempt.mode === 'disconnect' ? 'POST' : 'GET');
        if (!controller.signal.aborted && accept(next)) interval = setInterval(() => void poll(), 3000);
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(error instanceof Error ? error.message : backendUnavailable);
          clearTimeout(timeout);
        }
      } finally { if (!controller.signal.aborted) setBusy(false); }
    }
    void start();
    return () => { controller.abort(); clearInterval(interval); clearTimeout(timeout); };
  }, [attempt]);

  useEffect(() => {
    if (!scanning) return;
    function refresh() { setQrTimestamp(Date.now()); setQrError(false); }
    refresh();
    const timer = setInterval(refresh, 20000);
    return () => clearInterval(timer);
  }, [scanning, attempt]);

  function run(mode: 'read' | 'connect' | 'disconnect') {
    if (busy || (mode !== 'read' && !canEdit)) return;
    if (mode === 'disconnect' && !window.confirm('Отключить WhatsApp? Для повторного подключения потребуется QR-код.')) return;
    active.current?.abort();
    setBusy(true);
    setAttempt({ mode });
  }

  return <>
    <p role="status" className={`mb-5 text-sm ${isConnected(state.status) ? 'font-medium text-green-600' : 'text-gray-600'}`}>
      {state.status === 'STARTING' || busy ? <span aria-hidden="true" className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" /> : null}
      {expired ? 'Истекло время ожидания. Повторите проверку статуса.'
        : state.status ? statusLabel(state.status) : busy ? 'Проверяем подключение…' : 'Статус подключения недоступен'}
    </p>
    {state.status === 'FAILED' && state.reason ? <p className="mb-4 text-sm text-red-600">{state.reason}</p> : null}
    {scanning ? <section className="mb-5">
      <h2 className="mb-3 text-lg font-semibold">Как подключить</h2>
      <ol className="mb-5 list-decimal space-y-2 pl-5 text-sm text-gray-600">
        <li>Откройте WhatsApp на телефоне, к номеру которого подключаем помощника</li>
        <li>Настройки → Связанные устройства → Привязка устройства</li>
        <li>Наведите камеру на QR-код ниже</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={qrTimestamp} src={`/api/waha/qr?ts=${qrTimestamp}`} width={280} height={280} alt="QR-код для подключения WhatsApp" className="mx-auto mb-3" onLoad={() => setQrError(false)} onError={() => setQrError(true)} />
      {qrError ? <p role="alert" className="mb-3 text-sm text-red-600">QR пока недоступен. Проверяем статус подключения.</p> : null}
      <p className="mb-3 text-sm text-gray-500">Код обновляется автоматически. Если не сработало — нажмите «Обновить код».</p>
      <button type="button" className="rounded-lg border px-4 py-3 text-blue-600" onClick={() => { setQrTimestamp(Date.now()); setQrError(false); }}>Обновить код</button>
    </section> : null}
    {error ? <p role="alert" className="mb-5 text-sm text-red-600">{error}</p> : null}
    {expired || error ? <button type="button" disabled={busy} className={buttonClass} onClick={() => run('read')}>Проверить статус</button>
      : canEdit && !busy && !shouldPoll(state.status) && !isConnected(state.status) && state.status
        ? <button type="button" className={buttonClass} onClick={() => run('connect')}>{actionLabel(state.status)}</button> : null}
    {cabinet && canEdit ? <Link className="block text-sm text-blue-600" href="/onboarding/owner">Настройки владельца</Link> : null}
    {cabinet && canEdit && isConnected(state.status) ? <button type="button" disabled={busy} className="rounded-lg border border-red-200 px-4 py-3 text-red-600 disabled:opacity-50" onClick={() => run('disconnect')}>Отключить</button> : null}
    {!cabinet ? <div className="mt-8 flex items-center justify-between gap-4">
      <Link className="text-sm text-blue-600" href="/onboarding/step-4">Пропустить</Link>
      {isConnected(state.status) ? <Link className={buttonClass} href="/onboarding/owner">Далее →</Link> : null}
    </div> : null}
  </>;
}
