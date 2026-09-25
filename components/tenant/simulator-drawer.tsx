'use client';
import {useEffect} from 'react';
import {useI18n} from '@/lib/i18n';
import {useSimulatorDrawer} from '@/lib/tenant/simulator-drawer';
import ConversationSimulator from './conversation-simulator';

export function SimulatorOpenButton() {
  const {t} = useI18n();
  const {open, openDrawer} = useSimulatorDrawer();
  return <button type="button" className="button secondary simulator-open-button" onClick={openDrawer} aria-haspopup="dialog" aria-expanded={open}>{t('simulatorOpenButton')}</button>;
}

export default function SimulatorDrawer() {
  const {t} = useI18n();
  const {open, closeDrawer, dirty} = useSimulatorDrawer();

  useEffect(() => {
    document.body.classList.toggle('simulator-drawer-open', open);
    return () => document.body.classList.remove('simulator-drawer-open');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) { if (event.key === 'Escape') closeDrawer(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, closeDrawer]);

  return <aside className={`simulator-drawer ${open ? 'open' : ''}`} role="dialog" aria-modal="false" aria-hidden={!open}>
    <div className="simulator-drawer-topbar">
      <button type="button" className="icon-button simulator-drawer-close" onClick={closeDrawer} aria-label={t('close')} tabIndex={open ? 0 : -1}>×</button>
    </div>
    <div className="simulator-drawer-body">
      <ConversationSimulator dirtyWarning={dirty} />
    </div>
  </aside>;
}
