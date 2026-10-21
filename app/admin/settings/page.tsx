import {redirect} from 'next/navigation';
import AppShell from '@/components/ui/app-shell';
import SettingsHeading from '@/components/tenant/settings-heading';
import TenantSettings from '@/components/tenant/tenant-settings';
import {getAccountProfile} from '@/lib/auth/profile';
import {settingsSection} from '@/lib/tenant/labels';

/** Z8 «Настройки»: all owner settings in sections; «Аккаунт» needs the account profile (server side). */
export default async function SettingsPage({searchParams}:{searchParams:{section?:string}}){
 const profile=await getAccountProfile();
 if(!profile)redirect('/login?error=session_expired');
 return <AppShell><main className="page-wrap"><div className="content-stack"><SettingsHeading/><TenantSettings profile={profile} section={settingsSection(searchParams.section)}/></div></main></AppShell>;
}
