'use client';
import Link from 'next/link';
import AssistantSettings from '@/components/tenant/assistant-settings';
import KnowledgeEditor from '@/components/tenant/knowledge-editor';
import WhatsAppStatus from '@/components/tenant/whatsapp-status';
import OwnerSummary from '@/components/tenant/owner-summary';
import {useI18n} from '@/lib/i18n';
import AppShell from '@/components/ui/app-shell';

export default function AdminPage() {
  const {t}=useI18n();
  return (
    <AppShell><main className="page-wrap">
      <div className="content-stack">
        <header className="page-heading"><div><p className="eyebrow">{t('todayLabel')}</p><h1>{t('helloTitle')}</h1><p>{t('helloText')}</p></div><Link href="/admin/settings" className="icon-button" aria-label={t('settingsNav')}>•••</Link></header>
        <section aria-labelledby="whatsapp-heading" className="connection-card">
          <div className="connection-copy"><span className="status-pulse"/><div><p className="card-kicker">WhatsApp</p><h2 id="whatsapp-heading">{t('whatsappReady')}</h2><p>{t('whatsappReadyText')}</p></div></div>
          <WhatsAppStatus />
        </section>
        <OwnerSummary />
        <section id="knowledge" aria-labelledby="faq-heading" className="surface-card">
          <div className="section-heading"><div><p className="card-kicker">{t('knowledgeKicker')}</p><h2 id="faq-heading">{t('faqTitle')}</h2><p>{t('knowledgeHelp')}</p></div><span className="soft-badge">{t('growing')}</span></div>
          <KnowledgeEditor />
        </section>
        <section aria-labelledby="assistant-heading" className="surface-card">
          <h2 id="assistant-heading" className="mb-5 text-xl font-bold text-gray-900">{t('assistantTitle')}</h2>
          <AssistantSettings />
        </section>
      </div>
    </main></AppShell>
  );
}
