'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { beginSession, requestSession, isConnected, shouldPoll, backendUnavailable, type SessionState } from '@/lib/waha/connection';
import { buttonClass } from '@/app/onboarding/step-frame';
import {useI18n} from '@/lib/i18n';

export default function WhatsAppConnection({ cabinet = false, canEdit = true }: { cabinet?: boolean; canEdit?: boolean }) {
  const {t}=useI18n();
  const statusText=(status:string)=>({NOT_CREATED:t('statusNotCreated'),STOPPED:t('statusStopped'),DISCONNECTED:t('statusStopped'),STARTING:t('statusStarting'),SCAN_QR_CODE:t('statusScan'),WORKING:t('statusWorking'),FAILED:t('statusFailed')}[status]??status);
  const actionText=(status:string)=>status==='NOT_CREATED'?t('connectWhatsApp'):['STOPPED','DISCONNECTED'].includes(status)?t('connect'):t('retry');
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
    if (mode === 'disconnect' && !window.confirm(t('disconnectConfirm'))) return;
    active.current?.abort();
    setBusy(true);
    setAttempt({ mode });
  }

  return <>
    <p role="status" className={`mb-5 text-sm ${isConnected(state.status) ? 'font-medium text-green-600' : 'text-gray-600'}`}>
      {state.status === 'STARTING' || busy ? <span aria-hidden="true" className="me-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" /> : null}
      {expired ? t('waitExpired')
        : state.status ? statusText(state.status) : busy ? t('checkingConnection') : t('statusUnavailable')}
    </p>
    {state.status === 'FAILED' && state.reason ? <p className="mb-4 text-sm text-red-600">{state.reason}</p> : null}
    {scanning ? <section className="mb-5">
      <h2 className="mb-3 text-lg font-semibold">{t('howConnect')}</h2>
      <ol className="mb-5 list-decimal space-y-2 ps-5 text-sm text-gray-600">
        <li>{t('waStep1')}</li><li>{t('waStep2')}</li><li>{t('waStep3')}</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={qrTimestamp} src={`/api/waha/qr?ts=${qrTimestamp}`} width={280} height={280} alt={t('qrAlt')} className="mx-auto mb-3" onLoad={() => setQrError(false)} onError={() => setQrError(true)} />
      {qrError ? <p role="alert" className="mb-3 text-sm text-red-600">{t('qrUnavailable')}</p> : null}
      <p className="mb-3 text-sm text-gray-500">{t('qrRefreshHelp')}</p>
      <button type="button" className="rounded-lg border px-4 py-3 text-blue-600" onClick={() => { setQrTimestamp(Date.now()); setQrError(false); }}>{t('refreshCode')}</button>
    </section> : null}
    {error ? <p role="alert" className="mb-5 text-sm text-red-600">{error}</p> : null}
    {expired || error ? <button type="button" disabled={busy} className={buttonClass} onClick={() => run('read')}>{t('checkStatus')}</button>
      : canEdit && !busy && !shouldPoll(state.status) && !isConnected(state.status) && state.status
        ? <button type="button" className={buttonClass} onClick={() => run('connect')}>{actionText(state.status)}</button> : null}
    {cabinet && canEdit ? <Link className="block text-sm text-blue-600" href="/onboarding/owner">{t('ownerSettings')}</Link> : null}
    {cabinet && canEdit && isConnected(state.status) ? <button type="button" disabled={busy} className="rounded-lg border border-red-200 px-4 py-3 text-red-600 disabled:opacity-50" onClick={() => run('disconnect')}>{t('disconnect')}</button> : null}
    {!cabinet ? <div className="mt-8 flex items-center justify-between gap-4">
      <Link className="text-sm text-blue-600" href="/onboarding/step-4">{t('skip')}</Link>
      {isConnected(state.status) ? <Link className={buttonClass} href="/onboarding/owner">{t('next')} <span className="direction-icon">→</span></Link> : null}
    </div> : null}
  </>;
}
