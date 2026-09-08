import Link from 'next/link';
import TenantSettings from '@/components/tenant/tenant-settings';
export default function SettingsPage(){return <main className="min-h-screen bg-gray-50 px-4 py-12"><div className="mx-auto max-w-3xl space-y-6"><Link href="/admin" className="text-blue-600">← Кабинет</Link><h1 className="text-3xl font-bold text-gray-900">Настройки бизнеса</h1><TenantSettings /></div></main>;}
