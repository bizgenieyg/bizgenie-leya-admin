'use client';
import ClientDirectory from '@/components/tenant/client-directory';
import {useI18n} from '@/lib/i18n';
import AppShell from '@/components/ui/app-shell';
import PageHeading from '@/components/ui/page-heading';
export default function ClientsPage(){const{t}=useI18n();return <AppShell><main className="page-wrap"><div className="content-stack wide"><PageHeading title={t('clientsLink')} help={t('clientsIntro')}/><ClientDirectory/></div></main></AppShell>;}
