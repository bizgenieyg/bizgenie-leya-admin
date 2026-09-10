import Link from 'next/link';import ClientDirectory from '@/components/tenant/client-directory';
export default function ClientsPage(){return <main className="min-h-screen bg-gray-50 px-4 py-12"><div className="mx-auto max-w-5xl space-y-6"><Link href="/admin" className="text-blue-600">← В кабинет</Link><h1 className="text-3xl font-bold">Клиенты</h1><ClientDirectory/></div></main>;}
