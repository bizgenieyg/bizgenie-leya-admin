export type TenantRole = 'owner' | 'admin' | 'viewer';

export function requireRole(allowed: readonly TenantRole[], role: unknown): asserts role is TenantRole {
  if (typeof role !== 'string' || !allowed.includes(role as TenantRole)) {
    throw new Error('Недостаточно прав для изменения настроек бизнеса.');
  }
}
