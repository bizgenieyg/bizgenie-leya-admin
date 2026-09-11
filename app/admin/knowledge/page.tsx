'use client';
import Link from 'next/link';
import KnowledgeEditor from '@/components/tenant/knowledge-editor';
import AppShell from '@/components/ui/app-shell';
import {useI18n} from '@/lib/i18n';
export default function KnowledgePage(){const{t}=useI18n();return <AppShell><main className="page-wrap"><div className="content-stack"><Link href="/admin" className="back-link"><span className="direction-icon">←</span> {t('backCabinet')}</Link><header className="page-heading"><div><p className="eyebrow">Leya</p><h1>{t('knowledgeNav')}</h1><p>{t('knowledgeHelp')}</p></div></header><section className="surface-card"><KnowledgeEditor/></section></div></main></AppShell>}
