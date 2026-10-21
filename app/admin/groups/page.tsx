'use client';

import AppShell from '@/components/ui/app-shell';
import GroupDirectory from '@/components/tenant/group-directory';
import PageHeading from '@/components/ui/page-heading';
import {useI18n} from '@/lib/i18n';

export default function GroupsPage(){const{t}=useI18n();return <AppShell><main className="page-wrap"><div className="content-stack"><PageHeading title={t('groupsTitle')}/><aside className="info-banner">{t('groupsInfo')}</aside><GroupDirectory/></div></main></AppShell>}
