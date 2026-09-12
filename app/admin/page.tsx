'use client';
import Link from 'next/link';
import WhatsAppStatus from '@/components/tenant/whatsapp-status';
import OwnerSummary from '@/components/tenant/owner-summary';
import ConversationSimulator from '@/components/tenant/conversation-simulator';
import EmergencyStop from '@/components/tenant/emergency-stop';
import {useI18n} from '@/lib/i18n';
import AppShell from '@/components/ui/app-shell';
export default function AdminPage(){const{t}=useI18n();return <AppShell><main className="page-wrap"><div className="content-stack"><header className="page-heading"><div><p className="eyebrow">{t('todayLabel')}</p><h1>{t('helloTitle')}</h1><p>{t('helloText')}</p></div><Link href="/admin/settings" className="icon-button" aria-label={t('settingsNav')}>•••</Link></header><section aria-labelledby="whatsapp-heading" className="connection-card"><div className="connection-copy"><span className="status-pulse"/><div><p className="card-kicker">WhatsApp</p><h2 id="whatsapp-heading">{t('whatsappReady')}</h2><p>{t('whatsappReadyText')}</p></div></div><div className="connection-actions"><WhatsAppStatus/><EmergencyStop/></div></section><OwnerSummary/><ConversationSimulator/></div></main></AppShell>}
