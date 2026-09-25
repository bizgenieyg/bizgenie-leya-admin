'use client';
import { useEffect, useState } from 'react';
import { getOnboardingTenant } from '@/lib/onboarding/tenant';

/**
 * The tenant's assistant name (assistant_profiles.assistant_name), used only as a standalone label
 * (sender, "… is typing"). Texts about the assistant's behaviour stay neutral and never inflect it.
 * Empty or unavailable → null, and callers show the neutral "Assistant" label.
 */
export function useAssistantName(): string | null {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { supabase, tenantId } = await getOnboardingTenant();
        const { data } = await supabase.from('assistant_profiles').select('assistant_name').eq('tenant_id', tenantId).maybeSingle();
        const value = typeof data?.assistant_name === 'string' ? data.assistant_name.trim() : '';
        if (!cancelled) setName(value || null);
      } catch { if (!cancelled) setName(null); }
    })();
    return () => { cancelled = true; };
  }, []);
  return name;
}
