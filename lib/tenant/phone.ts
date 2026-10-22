/**
 * Z9: owner numbers in one form. Input as «052…», «52…», «972…» or «+972…» (spaces, dashes, brackets allowed) is
 * brought to E.164 digits with the chosen country code; the backend stores the digits without «+».
 */
export const COUNTRY_CODES = ['972', '7', '380', '1', '44', '49', '33', '375'] as const;

export function normalizePhone(input: string, countryCode: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const plus = raw.startsWith('+') || raw.startsWith('00');
  let digits = raw.replace(/\D/g, '');
  if (raw.startsWith('00')) digits = digits.slice(2);
  if (!plus && !digits.startsWith(countryCode)) digits = countryCode + digits.replace(/^0+/, '');
  // E.164: at most 15 digits; shorter than 8 is not a phone number.
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

/** «+972 52-369-5741» for Israeli mobile/landline numbers, «+<digits>» for others. */
export function formatPhone(raw: unknown): string {
  const digits = typeof raw === 'string' ? raw.replace(/\D/g, '') : '';
  if (!digits) return '';
  const il = /^972(\d{2})(\d{3})(\d{4})$/.exec(digits) ?? /^972(\d)(\d{3})(\d{4})$/.exec(digits);
  return il ? `+972 ${il[1]}-${il[2]}-${il[3]}` : `+${digits}`;
}
