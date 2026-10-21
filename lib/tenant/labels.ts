/**
 * Z8: pure helpers of the cabinet shell and «Настройки» (no React, no imports — unit-tested as is).
 */

/** The assistant name as the owner set it; empty → the localized default («Лея» / «Leya» / «לאה»). */
export const assistantLabel = (raw: unknown, fallback: string) => (typeof raw === 'string' && raw.trim() ? raw.trim() : fallback);

/** «Главная» WhatsApp card: one of three states by the session status; '' (not loaded yet) → 'loading'. */
export type WhatsAppCardState = 'loading' | 'connected' | 'not_connected' | 'lost';
export function whatsappCardState(status: string): WhatsAppCardState {
  if (!status) return 'loading';
  if (status === 'WORKING') return 'connected';
  if (['NOT_CREATED', 'STOPPED', 'SCAN_QR_CODE'].includes(status)) return 'not_connected';
  return 'lost';
}

/** «Настройки» sections in display order; `?section=` opens one of them (old /admin/assistant and /admin/profile redirect here). */
export const SETTINGS_SECTIONS = ['whatsapp', 'phone', 'business', 'assistant', 'schedule', 'account'] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];
export const settingsSection = (value: unknown): SettingsSection | null =>
  typeof value === 'string' && (SETTINGS_SECTIONS as readonly string[]).includes(value) ? value as SettingsSection : null;

/** Sector suggestion groups (texts in the dictionaries: sectorGroup_<key>, sectorItems_<key> joined by «|»). */
export const SECTOR_GROUPS = ['beauty_health', 'education', 'food', 'retail', 'projects', 'business', 'other'] as const;
export const sectorSuggestions = (t: (key: string) => string) =>
  SECTOR_GROUPS.map(key => ({ key, label: t(`sectorGroup_${key}`), items: t(`sectorItems_${key}`).split('|').filter(Boolean) }));

/** Knowledge topics shown as cards (required or with facts) — the «Заполнено тем» counter counts the same cards. */
export function topicCounter<T extends { required: boolean; facts: unknown[] }>(topics: T[]) {
  const shown = topics.filter(topic => topic.facts.length || topic.required);
  return { shown, filled: shown.filter(topic => topic.facts.length).length, total: shown.length };
}

/** A stored phone (digits, maybe with +) as the owner reads it: «+972…»; empty → ''. */
export const displayPhone = (raw: unknown) => { const digits = typeof raw === 'string' ? raw.replace(/\D/g, '') : ''; return digits ? `+${digits}` : ''; };
