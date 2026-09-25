'use client';
import Link from 'next/link';
import AppShell from '@/components/ui/app-shell';
import AssistantSettings from '@/components/tenant/assistant-settings';
import KnowledgeEditor from '@/components/tenant/knowledge-editor';
import KnowledgeMaterials from '@/components/tenant/knowledge-materials';
import DiscoveryQuestions from '@/components/tenant/discovery-questions';
import {SimulatorOpenButton} from '@/components/tenant/simulator-drawer';
import {useI18n} from '@/lib/i18n';

export default function AssistantPage(){
 const{t}=useI18n();
 return <AppShell><main className="page-wrap"><div className="content-stack wide">
  <Link href="/admin" className="back-link"><span className="direction-icon">←</span> {t('backCabinet')}</Link>
  <header className="page-heading"><div><p className="eyebrow">Leya</p><h1>{t('assistantNav')}</h1><p>{t('assistantWorkspaceHelp')}</p></div><SimulatorOpenButton/></header>
  <div className="assistant-workspace">
   <div className="assistant-controls">
    <section className="surface-card"><div className="section-heading"><div><p className="card-kicker">{t('assistantIdentityKicker')}</p><h2>{t('assistantTitle')}</h2><p>{t('assistantSettingsHelp')}</p></div></div><AssistantSettings/></section>
    <section className="surface-card"><div className="section-heading"><div><h2>{t('discoveryTitle')}</h2><p>{t('discoveryHelp')}</p></div></div><DiscoveryQuestions/></section>
    <section id="knowledge" className="surface-card"><div className="section-heading"><div><p className="card-kicker">{t('knowledgeKicker')}</p><h2>{t('faqTitle')}</h2><p>{t('knowledgeHelp')}</p></div></div><KnowledgeEditor/></section>
    <section className="surface-card"><div className="section-heading"><div><p className="card-kicker">{t('materialsKicker')}</p><h2>{t('uploadedMaterials')}</h2><p>{t('uploadedMaterialsHelp')}</p></div></div><KnowledgeMaterials/></section>
   </div>
  </div>
 </div></main></AppShell>;
}
