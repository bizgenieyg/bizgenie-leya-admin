'use client';
import {useState} from 'react';
import Link from 'next/link';
import WhatsAppStatus from '@/components/tenant/whatsapp-status';
import OwnerSummary from '@/components/tenant/owner-summary';
import EmergencyStop from '@/components/tenant/emergency-stop';
import TariffOverview from '@/components/tenant/tariff-overview';
import {useI18n} from '@/lib/i18n';
import AppShell from '@/components/ui/app-shell';
import FeedbackCard from '@/components/tenant/feedback-card';
export default function AdminPage(){const{t}=useI18n();const[status,setStatus]=useState('');const disconnected=!!status&&status!=='WORKING'&&status!=='STARTING';return <AppShell><main className="page-wrap"><div className="content-stack"><header className="page-heading"><div><p className="eyebrow">{t('todayLabel')}</p><h1>{t('helloTitle')}</h1><p>{t('helloText')}</p></div><Link href="/admin/settings" className="icon-button" aria-label={t('settingsNav')}>•••</Link></header>{disconnected?<div role="alert" className="connection-card whatsapp-alert"><div><h2>{t('whatsappDisconnectedAlert')}</h2><p>{t('whatsappDisconnectedHelp')}</p></div><a className="button" href="#whatsapp-heading">{t('whatsappReconnect')}</a></div>:null}<section aria-labelledby="whatsapp-heading" className="connection-card"><div className="connection-copy"><span className="status-pulse"/><div><p className="card-kicker">WhatsApp</p><h2 id="whatsapp-heading">{disconnected?t('whatsappDisconnectedTitle'):t('whatsappReady')}</h2><p>{disconnected?t('whatsappDisconnectedHelp'):t('whatsappReadyText')}</p></div></div><div className="connection-actions"><WhatsAppStatus onStatusChange={setStatus}/></div></section><EmergencyStop launchGuide/><OwnerSummary/><TariffOverview/><FeedbackCard/></div></main></AppShell>}
