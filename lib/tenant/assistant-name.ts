'use client';
import { useEffect, useState } from 'react';
import { getOnboardingTenant } from '@/lib/onboarding/tenant';
import { assistantLabel } from './labels';

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

/** Z8: fired by «Настройки → Ассистент» after a save, so the menu shows the new name without a reload. */
export const ASSISTANT_NAME_EVENT = 'leya-assistant-name';

/**
 * Z8: the name for «Что знает {имя}» (nominative only): the owner's name or the localized default.
 * `null` while loading — callers render a placeholder of the same size, not a default that then changes.
 */
export function useAssistantLabel(fallback: string): string | null {
  const [state, setState] = useState<{ loaded: boolean; name: string }>({ loaded: false, name: '' });
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { supabase, tenantId } = await getOnboardingTenant();
        const { data } = await supabase.from('assistant_profiles').select('assistant_name').eq('tenant_id', tenantId).maybeSingle();
        if (!cancelled) setState({ loaded: true, name: typeof data?.assistant_name === 'string' ? data.assistant_name : '' });
      } catch { if (!cancelled) setState({ loaded: true, name: '' }); }
    })();
    const changed = (event: Event) => setState({ loaded: true, name: String((event as CustomEvent<string>).detail ?? '') });
    window.addEventListener(ASSISTANT_NAME_EVENT, changed);
    return () => { cancelled = true; window.removeEventListener(ASSISTANT_NAME_EVENT, changed); };
  }, []);
  return state.loaded ? assistantLabel(state.name, fallback) : null;
}
