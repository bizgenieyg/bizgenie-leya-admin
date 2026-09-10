import Link from 'next/link';
import AssistantSettings from '@/components/tenant/assistant-settings';
import KnowledgeEditor from '@/components/tenant/knowledge-editor';
import WhatsAppStatus from '@/components/tenant/whatsapp-status';
import OwnerSummary from '@/components/tenant/owner-summary';

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Кабинет</h1>
        <div className="flex gap-5"><Link href="/admin/settings" className="text-blue-600">Настройки бизнеса и расход</Link><Link href="/admin/clients" className="text-blue-600">Клиенты</Link></div>
        <OwnerSummary />
        <section aria-labelledby="whatsapp-heading" className="rounded-2xl bg-white p-8 shadow-sm">
          <h2 id="whatsapp-heading" className="mb-5 text-xl font-bold text-gray-900">WhatsApp</h2>
          <WhatsAppStatus />
        </section>
        <section aria-labelledby="faq-heading" className="rounded-2xl bg-white p-8 shadow-sm">
          <h2 id="faq-heading" className="mb-5 text-xl font-bold text-gray-900">Вопросы и ответы</h2>
          <KnowledgeEditor />
        </section>
        <section aria-labelledby="assistant-heading" className="rounded-2xl bg-white p-8 shadow-sm">
          <h2 id="assistant-heading" className="mb-5 text-xl font-bold text-gray-900">Настройки помощника</h2>
          <AssistantSettings />
        </section>
      </div>
    </main>
  );
}
