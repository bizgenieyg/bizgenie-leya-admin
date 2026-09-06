'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getOnboardingTenant } from '@/lib/onboarding/tenant';
import { isConnected, requestStatus, backendUnavailable } from '@/lib/waha/connection';
import { buttonClass } from '@/app/onboarding/step-frame';

export default function WhatsAppStatus() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const active = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    active.current = controller;
    async function load() {
      try {
        const tenant = await getOnboardingTenant();
        if (controller.signal.aborted) return;
        try { tenant.requireRole(['owner', 'admin']); setCanEdit(true); } catch { setCanEdit(false); }
        const next = await requestStatus('/api/waha/status', controller.signal);
        if (!controller.signal.aborted) setStatus(next);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : backendUnavailable);
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => { controller.abort(); active.current?.abort(); };
  }, []);

  async function disconnect() {
    if (busy || !window.confirm('Отключить WhatsApp? Для повторного подключения потребуется QR-код.')) return;
    setBusy(true);
    setError('');
    const controller = new AbortController();
    active.current = controller;
    try {
      const tenant = await getOnboardingTenant();
      tenant.requireRole(['owner', 'admin']);
      const next = await requestStatus('/api/waha/disconnect', controller.signal, 'POST');
      if (!controller.signal.aborted) setStatus(next);
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : backendUnavailable);
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }

  return <>
    <p role="status" className={`mb-4 text-sm ${isConnected(status) ? 'font-medium text-green-600' : 'text-gray-600'}`}>
      {loading ? 'Проверяем подключение…' : error && !status ? 'Статус подключения недоступен' : isConnected(status) ? 'Подключено' : 'Не подключено'}
    </p>
    {error ? <p role="alert" className="mb-4 text-sm text-red-600">{error}</p> : null}
    {!loading && canEdit ? isConnected(status)
      ? <button type="button" disabled={busy} className="rounded-lg border border-red-200 px-4 py-3 text-red-600 disabled:opacity-50" onClick={() => void disconnect()}>{busy ? 'Отключение…' : 'Отключить'}</button>
      : <Link className={`${buttonClass} inline-block`} href="/onboarding/step-3">Подключить</Link>
      : null}
  </>;
}
