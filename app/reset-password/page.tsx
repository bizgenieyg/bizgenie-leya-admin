import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ResetPasswordForm from './reset-password-form';

export default async function ResetPasswordPage() {
  const { data: { user }, error } = await createClient().auth.getUser();
  if (error || !user) redirect('/login');
  return <ResetPasswordForm />;
}
