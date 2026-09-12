import {redirect} from 'next/navigation';
import AppShell from '@/components/ui/app-shell';
import ProfilePanel from '@/components/tenant/profile-panel';
import {getAccountProfile} from '@/lib/auth/profile';
export default async function ProfilePage(){const profile=await getAccountProfile();if(!profile)redirect('/login?error=session_expired');return <AppShell><main className="page-wrap"><ProfilePanel profile={profile}/></main></AppShell>}
