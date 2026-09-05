'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { buttonClass, StepFrame } from '../step-frame';

const connected = (status: string) => status === 'WORKING' || status === 'CONNECTED';
const labels: Record<string, string> = {
  IDLE: 'Подключите WhatsApp вашего бизнеса.',
  NOT_CREATED: 'Сессия ещё не создана. Нажмите «Подключить WhatsApp».',
  STARTING: 'Запускаем WhatsApp…',
  SCAN_QR_CODE: 'Отсканируйте QR в WhatsApp: Настройки → Связанные устройства → Привязка устройства.',
  WORKING: 'Подключено', CONNECTED: 'Подключено',
  STOPPED: 'Сессия остановлена. Попробуйте подключиться снова.',
  FAILED: 'Не удалось подключиться. Попробуйте ещё раз.',
  DISCONNECTED: 'WhatsApp отключён. Попробуйте подключиться снова.',
};

async function requestStatus(path: string, signal: AbortSignal, method = 'GET') {
  const response = await fetch(path, { method, signal, cache: 'no-store' });
  if (!response.ok) throw new Error(response.status === 401 ? 'Сессия истекла. Войдите снова.' : response.status === 409 ? 'Не удалось однозначно определить текущий бизнес.' : 'Не удалось подключиться к WhatsApp. Попробуйте ещё раз.');
  const data = await response.json();
  if (typeof data.status !== 'string') throw new Error('Не удалось получить статус WhatsApp.');
  return data.status.toUpperCase() as string;
}

export default function OnboardingStepThreePage() {
  const [status, setStatus] = useState('IDLE');
  const [qr, setQr] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [expired, setExpired] = useState(false);
  const active = useRef<AbortController | null>(null);
  const qrUrl = useRef('');

  function clearQr() {
    if (qrUrl.current) URL.revokeObjectURL(qrUrl.current);
    qrUrl.current = '';
    setQr('');
  }

  useEffect(() => () => {
    active.current?.abort();
    if (qrUrl.current) URL.revokeObjectURL(qrUrl.current);
  }, []);

  useEffect(() => {
    if (!attempt) return;
    const controller = new AbortController();
    active.current = controller;
    let inFlight = false;
    const timeout = window.setTimeout(() => {
      controller.abort();
      window.clearInterval(interval);
      clearQr();
      setExpired(true);
      setBusy(false);
    }, 180000);

    async function poll() {
      if (inFlight || controller.signal.aborted) return;
      inFlight = true;
      try {
        const nextStatus = await requestStatus('/api/waha/status', controller.signal);
        if (controller.signal.aborted) return;
        setStatus(nextStatus);
        setError('');
        if (connected(nextStatus)) {
          window.clearInterval(interval);
          window.clearTimeout(timeout);
          clearQr();
          return;
        }
        if (nextStatus === 'SCAN_QR_CODE' && !qrUrl.current) {
          const response = await fetch('/api/waha/qr', { signal: controller.signal, cache: 'no-store' });
          if (!response.ok) throw new Error('QR пока недоступен. Ожидаем новый код…');
          const blob = await response.blob();
          if (controller.signal.aborted) return;
          qrUrl.current = URL.createObjectURL(blob);
          setQr(qrUrl.current);
        } else if (nextStatus !== 'SCAN_QR_CODE') {
          clearQr();
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Не удалось проверить подключение.');
      } finally { inFlight = false; }
    }
    const interval = window.setInterval(() => void poll(), 3000);
    void poll();
    return () => { controller.abort(); window.clearInterval(interval); window.clearTimeout(timeout); };
  }, [attempt]);

  async function start() {
    if (busy) return;
    active.current?.abort();
    setAttempt(0);
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError('');
    setExpired(false);
    clearQr();
    try {
      // An existing connected session must not be restarted.
      let nextStatus = await requestStatus('/api/waha/status', controller.signal);
      if (!connected(nextStatus) && nextStatus !== 'SCAN_QR_CODE' && nextStatus !== 'STARTING') {
        nextStatus = await requestStatus('/api/waha/create', controller.signal, 'POST');
      }
      if (controller.signal.aborted) return;
      setStatus(nextStatus);
      if (!connected(nextStatus)) setAttempt((current) => current + 1);
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Не удалось начать подключение.');
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }

  function refreshQr() {
    active.current?.abort();
    clearQr();
    setError('');
    setExpired(false);
    setAttempt((current) => current + 1);
  }

  return (
    <StepFrame step={3} title="Подключение WhatsApp">
      <p role="status" className={`mb-5 text-sm ${connected(status) ? 'font-medium text-green-600' : 'text-gray-600'}`}>
        {expired ? 'Время ожидания истекло. Обновите QR, чтобы повторить попытку.' : busy ? 'Подключаем WhatsApp…' : labels[status] ?? 'Ожидаем готовности WhatsApp…'}
      </p>
      {qr ? <Image unoptimized src={qr} width={280} height={280} alt="QR-код для подключения WhatsApp" className="mx-auto mb-5" /> : null}
      {error ? <p role="alert" className="mb-5 text-sm text-red-600">{error}</p> : null}
      {!connected(status) ? <div className="flex flex-wrap gap-3">
        <button type="button" className={buttonClass} disabled={busy} onClick={() => void start()}>Подключить WhatsApp</button>
        {attempt > 0 ? <button type="button" className="rounded-lg border px-4 py-3 text-blue-600 disabled:opacity-50" disabled={busy} onClick={refreshQr}>Обновить QR</button> : null}
      </div> : null}
      <div className="mt-8 flex items-center justify-between gap-4">
        <Link className="text-sm text-blue-600" href="/onboarding/step-4">Пропустить</Link>
        {connected(status) ? <Link className={buttonClass} href="/onboarding/step-4">Далее →</Link> : null}
      </div>
    </StepFrame>
  );
}
