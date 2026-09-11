'use client';
import Link from 'next/link';
import TenantSettings from '@/components/tenant/tenant-settings';
import {useI18n} from '@/lib/i18n';
import AppShell from '@/components/ui/app-shell';
export default function SettingsPage(){const{t}=useI18n();return <AppShell><main className="page-wrap"><div className="content-stack"><Link href="/admin" className="back-link"><span className="direction-icon">←</span> {t('backCabinet')}</Link><header className="page-heading"><div><p className="eyebrow">Leya</p><h1>{t('settingsTitle')}</h1><p>{t('settingsIntro')}</p></div></header><TenantSettings /></div></main></AppShell>;}
