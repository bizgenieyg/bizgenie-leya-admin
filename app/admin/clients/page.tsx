'use client';
import Link from 'next/link';import ClientDirectory from '@/components/tenant/client-directory';
import {useI18n} from '@/lib/i18n';
export default function ClientsPage(){const{t}=useI18n();return <main className="min-h-screen bg-gray-50 px-4 py-12"><div className="mx-auto max-w-5xl space-y-6"><Link href="/admin" className="text-blue-600"><span className="direction-icon">←</span> {t('backCabinet')}</Link><h1 className="text-3xl font-bold">{t('clientsLink')}</h1><ClientDirectory/></div></main>;}
