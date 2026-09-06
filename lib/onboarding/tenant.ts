import { createClient } from '@/lib/supabase/client';

import { requireRole, type TenantRole } from './roles';

export async function getOnboardingTenant() {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Сессия истекла. Войдите снова.');
  }

  // The stored selection is only a hint; membership must be verified for this user.
  const selected = sessionStorage.getItem('onboarding_tenant_id');
  let query = supabase.from('tenant_users').select('tenant_id, role').eq('user_id', user.id);
  if (selected) query = query.eq('tenant_id', selected);
  const { data, error } = await query.limit(2);
  if (error) throw new Error('Не удалось проверить доступ к бизнесу. Попробуйте ещё раз.');
  if (!data?.length) throw new Error('Бизнес не найден или недоступен. Вернитесь к шагу 1.');
  if (data.length !== 1) throw new Error('Не удалось однозначно определить текущий бизнес. Откройте onboarding в исходной вкладке.');
  const role = data[0].role as TenantRole;
  return { supabase, tenantId: data[0].tenant_id as string, role, requireRole: (allowed: readonly TenantRole[]) => requireRole(allowed, role) };
}
