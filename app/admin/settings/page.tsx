'use client';
import Link from 'next/link';
import TenantSettings from '@/components/tenant/tenant-settings';
import {useI18n} from '@/lib/i18n';
import AppShell from '@/components/ui/app-shell';
import AssistantSettings from '@/components/tenant/assistant-settings';
export default function SettingsPage(){const{t}=useI18n();return <AppShell><main className="page-wrap"><div className="content-stack"><Link href="/admin" className="back-link"><span className="direction-icon">←</span> {t('backCabinet')}</Link><header className="page-heading"><div><p className="eyebrow">Leya</p><h1>{t('settingsTitle')}</h1><p>{t('settingsIntro')}</p></div></header><TenantSettings/><section aria-labelledby="assistant-heading" className="surface-card"><h2 id="assistant-heading">{t('assistantTitle')}</h2><AssistantSettings/></section></div></main></AppShell>;}
