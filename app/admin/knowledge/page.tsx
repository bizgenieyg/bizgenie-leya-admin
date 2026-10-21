'use client';
import AppShell from '@/components/ui/app-shell';
import KnowledgeProfile from '@/components/tenant/knowledge-profile';

/** «Что знает {имя}» (task R, Z8): «Проверить ответы» is in the page heading, as on every cabinet page. */
export default function KnowledgePage(){
 return <AppShell><main className="page-wrap"><div className="content-stack wide"><KnowledgeProfile/></div></main></AppShell>;
}
