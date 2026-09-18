'use client';
import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { translatedApiError } from '@/lib/i18n/api-error';
import { Button, ConfirmDialog, ErrorState } from '@/components/ui/primitives';

// Owner-triggered only (e.g. after switching to a different business WhatsApp number) —
// never automatic. Deletes clients/conversations/messages/escalations/stats for the
// tenant; settings and the knowledge base are untouched (see backend
// reset_tenant_customer_data). Placed next to WhatsApp reconnect since that is the
// situation this exists for.
export default function ResetTenantData({ canEdit = true }: { canEdit?: boolean }) {
  const { t } = useI18n();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  async function reset() {
    setConfirm(false); setBusy(true); setError('');
    try {
      const r = await fetch('/api/reset-tenant-data', { method: 'POST' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(translatedApiError(t, d, 'resetTenantDataError'));
      setDone(true);
    } catch (e) { setError(e instanceof Error ? e.message : t('resetTenantDataError')); }
    finally { setBusy(false); }
  }
  if (!canEdit) return null;
  return <div className="reset-tenant-data">
    <p className="muted">{t('resetTenantDataHelp')}</p>
    {error ? <ErrorState message={error} /> : null}
    {done ? <p role="status" className="text-green-700">{t('resetTenantDataDone')}</p> : null}
    <Button type="button" tone="danger" disabled={busy} onClick={() => setConfirm(true)}>{t('resetTenantData')}</Button>
    <ConfirmDialog open={confirm} danger title={t('confirmAction')} onCancel={() => setConfirm(false)} onConfirm={() => void reset()}><p>{t('resetTenantDataConfirm')}</p></ConfirmDialog>
  </div>;
}
