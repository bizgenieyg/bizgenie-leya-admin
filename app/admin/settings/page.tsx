'use client';
import Link from 'next/link';
import TenantSettings from '@/components/tenant/tenant-settings';
import {useI18n} from '@/lib/i18n';
export default function SettingsPage(){const{t}=useI18n();return <main className="min-h-screen bg-gray-50 px-4 py-12"><div className="mx-auto max-w-3xl space-y-6"><Link href="/admin" className="text-blue-600"><span className="direction-icon">←</span> {t('adminTitle')}</Link><h1 className="text-3xl font-bold text-gray-900">{t('settingsTitle')}</h1><TenantSettings /></div></main>;}
