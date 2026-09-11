'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { beginSession, requestSession, isConnected, shouldPoll, backendUnavailable, type SessionState } from '@/lib/waha/connection';
import { buttonClass } from '@/app/onboarding/step-frame';
import {useI18n} from '@/lib/i18n';
import {Button,ConfirmDialog,ErrorState,Spinner} from '@/components/ui/primitives';

export default function WhatsAppConnection({ cabinet = false, canEdit = true }: { cabinet?: boolean; canEdit?: boolean }) {
  const {t}=useI18n();
  const statusText=(status:string)=>({NOT_CREATED:t('statusNotCreated'),STOPPED:t('statusStopped'),DISCONNECTED:t('statusStopped'),STARTING:t('statusStarting'),SCAN_QR_CODE:t('statusScan'),WORKING:t('statusWorking'),FAILED:t('statusFailed')}[status]??t('statusUnknown'));
  const actionText=(status:string)=>status==='NOT_CREATED'?t('connectWhatsApp'):['STOPPED','DISCONNECTED'].includes(status)?t('connect'):t('retry');
  const [state, setState] = useState<SessionState>({ status: '', qrAvailable: false });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [expired, setExpired] = useState(false);
  const [qrTimestamp, setQrTimestamp] = useState(0);
  const [qrError, setQrError] = useState(false);
  const [attempt, setAttempt] = useState<{ mode: 'read' | 'connect' | 'disconnect' }>({ mode: 'read' });
  const [confirmDisconnect,setConfirmDisconnect]=useState(false);
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
    active.current?.abort();
    setBusy(true);
    setAttempt({ mode });
  }

  return <div className={`qr-block status-${(state.status||'loading').toLowerCase()}`}>
    <p role="status" className={`connection-status ${isConnected(state.status) ? 'connected' : ''}`}>
      {state.status === 'STARTING' || busy ? <Spinner/> : null}
      {expired ? t('waitExpired')
        : state.status ? statusText(state.status) : busy ? t('checkingConnection') : t('statusUnavailable')}
    </p>
    {state.status === 'FAILED' && state.reason ? <p className="mb-4 text-sm text-red-600">{state.reason}</p> : null}
    {scanning ? <section className="qr-scan">
      <h2>{t('howConnect')}</h2>
      <ol>
        <li>{t('waStep1')}</li><li>{t('waStep2')}</li><li>{t('waStep3')}</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <div className="qr-image"><img key={qrTimestamp} src={`/api/waha/qr?ts=${qrTimestamp}`} width={280} height={280} alt={t('qrAlt')} onLoad={() => setQrError(false)} onError={() => setQrError(true)} /></div>
      {qrError ? <p role="alert" className="mb-3 text-sm text-red-600">{t('qrUnavailable')}</p> : null}
      <p className="mb-3 text-sm text-gray-500">{t('qrRefreshHelp')}</p>
      <Button type="button" tone="secondary" onClick={() => { setQrTimestamp(Date.now()); setQrError(false); }}>{t('refreshCode')}</Button>
    </section> : null}
    {error ? <ErrorState message={error} onRetry={()=>run('read')}/> : null}
    {expired || error ? <button type="button" disabled={busy} className={buttonClass} onClick={() => run('read')}>{t('checkStatus')}</button>
      : canEdit && !busy && !shouldPoll(state.status) && !isConnected(state.status) && state.status
        ? <button type="button" className={buttonClass} onClick={() => run('connect')}>{actionText(state.status)}</button> : null}
    {cabinet && canEdit ? <Link className="block text-sm text-blue-600" href="/onboarding/owner">{t('ownerSettings')}</Link> : null}
    {cabinet && canEdit && isConnected(state.status) ? <Button type="button" disabled={busy} tone="danger" onClick={() => setConfirmDisconnect(true)}>{t('disconnect')}</Button> : null}
    {!cabinet ? <div className="mt-8 flex items-center justify-between gap-4">
      <Link className="text-sm text-blue-600" href="/onboarding/step-4">{t('skip')}</Link>
      {isConnected(state.status) ? <Link className={buttonClass} href="/onboarding/owner">{t('next')} <span className="direction-icon">→</span></Link> : null}
    </div> : null}<ConfirmDialog open={confirmDisconnect} danger title={t('confirmAction')} onCancel={()=>setConfirmDisconnect(false)} onConfirm={()=>{setConfirmDisconnect(false);run('disconnect')}}><p>{t('disconnectConfirm')}</p></ConfirmDialog>
  </div>;
}
