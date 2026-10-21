'use client';
import PageHeading from '@/components/ui/page-heading';
import {useI18n} from '@/lib/i18n';
export default function SettingsHeading(){const{t}=useI18n();return <PageHeading title={t('settingsTitle')} help={t('settingsIntro')}/>;}
