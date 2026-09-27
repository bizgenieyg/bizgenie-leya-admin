'use client';
import AppShell from '@/components/ui/app-shell';
import KnowledgeProfile from '@/components/tenant/knowledge-profile';
import {SimulatorOpenButton} from '@/components/tenant/simulator-drawer';

/** "Что знает Лея" (task R): replaces the Q&A editor and the materials list; their data stays in the database. */
export default function KnowledgePage(){
 return <AppShell><main className="page-wrap"><div className="content-stack wide"><KnowledgeProfile/><div className="kp-simulator"><SimulatorOpenButton/></div></div></main></AppShell>;
}
