'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { beginConnection, requestStatus, isConnected, isFailed, backendUnavailable } from '@/lib/waha/connection';
import { buttonClass, StepFrame } from '../step-frame';

export default function OnboardingStepThreePage() {
  const [status, setStatus] = useState('IDLE');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);
  const [qrTimestamp, setQrTimestamp] = useState(0);
  const [qrError, setQrError] = useState(false);
  const [attempt, setAttempt] = useState<{ retry: boolean } | null>(null);
  const active = useRef<AbortController | null>(null);
  const scanning = status === 'SCAN_QR_CODE' && !expired;

  useEffect(() => {
    if (!attempt) return;
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
    setStatus('IDLE');

    function accept(next: string) {
      setStatus(next);
      setError('');
      if (isConnected(next) || isFailed(next)) {
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
        const next = await requestStatus('/api/waha/status', controller.signal);
        if (!controller.signal.aborted) accept(next);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : backendUnavailable);
      } finally { inFlight = false; }
    }

    async function start() {
      try {
        const next = await beginConnection(controller.signal, attempt!.retry);
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

  function connect(retry: boolean) {
    active.current?.abort();
    setAttempt({ retry });
  }

  return (
    <StepFrame step={3} title="Подключение WhatsApp">
      <p role="status" className={`mb-5 text-sm ${isConnected(status) ? 'font-medium text-green-600' : 'text-gray-600'}`}>
        {expired ? 'Истекло время ожидания. Нажмите «Подключить WhatsApp», чтобы повторить проверку.'
          : busy ? 'Подключаем WhatsApp…'
          : isConnected(status) ? 'Подключено'
          : isFailed(status) ? 'Не удалось подключиться'
          : status === 'IDLE' ? 'Подключите WhatsApp вашего бизнеса.'
          : scanning ? 'Ожидаем сканирования QR-кода.' : 'Ожидаем готовности WhatsApp…'}
      </p>
      {scanning ? <section className="mb-5">
        <h2 className="mb-3 text-lg font-semibold">Как подключить</h2>
        <ol className="mb-5 list-decimal space-y-2 pl-5 text-sm text-gray-600">
          <li>Откройте WhatsApp на телефоне, к номеру которого подключаем помощника</li>
          <li>Настройки → Связанные устройства → Привязка устройства</li>
          <li>Наведите камеру на QR-код ниже</li>
        </ol>
        {/* Native img preserves the authenticated same-origin binary QR route. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={qrTimestamp} src={`/api/waha/qr?ts=${qrTimestamp}`} width={280} height={280} alt="QR-код для подключения WhatsApp" className="mx-auto mb-3" onLoad={() => setQrError(false)} onError={() => setQrError(true)} />
        {qrError ? <p role="alert" className="mb-3 text-sm text-red-600">Не удалось загрузить QR-код. Обновите код или попробуйте позже.</p> : null}
        <p className="mb-3 text-sm text-gray-500">Код обновляется автоматически. Если не сработало — нажмите «Обновить код».</p>
        <button type="button" className="rounded-lg border px-4 py-3 text-blue-600" onClick={() => { setQrTimestamp(Date.now()); setQrError(false); }}>Обновить код</button>
      </section> : null}
      {error ? <p role="alert" className="mb-5 text-sm text-red-600">{error}</p> : null}
      {!isConnected(status) ? <button type="button" className={buttonClass} disabled={busy} onClick={() => connect(isFailed(status))}>
        {isFailed(status) ? 'Попробовать заново' : 'Подключить WhatsApp'}
      </button> : null}
      <div className="mt-8 flex items-center justify-between gap-4">
        <Link className="text-sm text-blue-600" href="/onboarding/step-4">Пропустить</Link>
        {isConnected(status) ? <Link className={buttonClass} href="/onboarding/step-4">Далее →</Link> : null}
      </div>
    </StepFrame>
  );
}
