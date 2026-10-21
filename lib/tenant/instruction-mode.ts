'use client';
import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';

/**
 * Z6: whether the tenant's replies go by an instruction (its own or the template of its deal type) — then tone,
 * style, greeting templates and discovery chips do not affect answers — and the simulator's suggested questions
 * in the cabinet language. `null` until loaded (nothing is hidden meanwhile). Z8: `loaded` — callers render nothing
 * that depends on it (suggestions, hidden blocks) before it is true, so nothing appears or disappears later.
 */
export function useInstructionMode(): { instructionAnswers: boolean | null; suggestions: string[]; loaded: boolean } {
  const { locale } = useI18n();
  const [state, setState] = useState<{ instructionAnswers: boolean | null; byLocale: Record<string, string[]>; loaded: boolean }>({ instructionAnswers: null, byLocale: {}, loaded: false });
  useEffect(() => {
    let active = true;
    void fetch('/api/tenant-settings', { cache: 'no-store' }).then(async r => {
      if (!r.ok) throw new Error();
      const settings = (await r.json())?.settings ?? {};
      const raw = settings.simulator_suggestions && typeof settings.simulator_suggestions === 'object' ? settings.simulator_suggestions as Record<string, unknown> : {};
      const byLocale = Object.fromEntries(Object.entries(raw).filter(([, v]) => Array.isArray(v) && v.every(x => typeof x === 'string')).map(([k, v]) => [k, (v as string[]).slice(0, 3)]));
      if (active) setState({ instructionAnswers: settings.instruction_answers === true, byLocale, loaded: true });
    }).catch(() => { if (active) setState({ instructionAnswers: null, byLocale: {}, loaded: true }); });
    return () => { active = false; };
  }, []);
  return { instructionAnswers: state.instructionAnswers, suggestions: state.byLocale[locale] ?? state.byLocale.ru ?? [], loaded: state.loaded };
}
