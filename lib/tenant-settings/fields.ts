// Field classification for the tenant-settings proxy. Kept in its own module (not the route
// file, which may only export HTTP handlers) so tests iterate the exact same lists and any
// drift is caught automatically.

// Owner/admin can change these from the cabinet.
export const editable = ['time_zone', 'weekly_schedule', 'auto_replies_paused', 'enabled_agents'];

// Operator-only runtime fields: rejected for cabinet users, changeable only by a caller
// holding ADMIN_SECRET directly (see backend src/routes/admin.ts).
export const operatorOnly = [
  'translate_owner_answer', 'escalation_remind_minutes', 'escalation_close_minutes',
  'auto_resume_hours', 'deferred_max_age_hours', 'context_message_count',
  'context_retention_hours', 'message_retention_days', 'intent_confidence_threshold',
  'route_stickiness_hours', 'reception_max_messages', 'campaign_routes', 'source_routes',
  'templates',
];

// Billing / tariff fields: operator-only and handled by PATCH /api/admin/usage-limits.
export const system = ['messages_per_month', 'voice_minutes_per_month', 'warning_percent', 'plan'];
