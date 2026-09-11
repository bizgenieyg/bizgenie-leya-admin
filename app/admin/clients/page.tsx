'use client';
import Link from 'next/link';import ClientDirectory from '@/components/tenant/client-directory';
import {useI18n} from '@/lib/i18n';
import AppShell from '@/components/ui/app-shell';
export default function ClientsPage(){const{t}=useI18n();return <AppShell><main className="page-wrap"><div className="content-stack wide"><Link href="/admin" className="back-link"><span className="direction-icon">←</span> {t('backCabinet')}</Link><header className="page-heading"><div><p className="eyebrow">{t('peopleKicker')}</p><h1>{t('clientsLink')}</h1><p>{t('clientsIntro')}</p></div></header><ClientDirectory/></div></main></AppShell>;}
