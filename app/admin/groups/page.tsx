'use client';

import AppShell from '@/components/ui/app-shell';
import GroupDirectory from '@/components/tenant/group-directory';
import {useI18n} from '@/lib/i18n';

export default function GroupsPage(){const{t}=useI18n();return <AppShell><main className="page-wrap"><div className="content-stack"><header className="page-heading"><div><p className="eyebrow">WhatsApp</p><h1>{t('groupsTitle')}</h1></div></header><aside className="info-banner">{t('groupsInfo')}</aside><GroupDirectory/></div></main></AppShell>}
