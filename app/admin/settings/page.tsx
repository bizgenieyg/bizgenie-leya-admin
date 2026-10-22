import {redirect} from 'next/navigation';
import AppShell from '@/components/ui/app-shell';
import SettingsHeading from '@/components/tenant/settings-heading';
import TenantSettings from '@/components/tenant/tenant-settings';
import {getAccountState} from '@/lib/auth/profile';
import {settingsSection} from '@/lib/tenant/labels';

/** Z8 «Настройки»: all owner settings in sections; «Аккаунт» needs the account profile (server side). */
export default async function SettingsPage({searchParams}:{searchParams:{section?:string}}){
 // Z8.1: sign in again only without a user; an unavailable profile shows an error in «Аккаунт», the page opens.
 const account=await getAccountState();
 if(!account.signedIn)redirect('/login?error=session_expired');
 const profile=account.profile;
 return <AppShell><main className="page-wrap"><div className="content-stack"><SettingsHeading/><TenantSettings profile={profile} section={settingsSection(searchParams.section)}/></div></main></AppShell>;
}
