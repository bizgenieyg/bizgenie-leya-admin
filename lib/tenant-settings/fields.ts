// Field classification for the tenant-settings proxy. Kept in its own module (not the route
// file, which may only export HTTP handlers) so tests iterate the exact same lists and any
// drift is caught automatically.

// Owner/admin can change these from the cabinet.
export const editable = ['business_sector', 'cabinet_language', 'time_zone', 'weekly_schedule', 'auto_replies_paused', 'enabled_agents', 'summary_frequency', 'summary_time', 'summary_weekday', 'polish_owner_answer', 'auto_resume_hours', 'client_discovery_questions', 'greeting_templates'];

// Operator-only runtime fields: rejected for cabinet users, changeable only by a caller
// holding ADMIN_SECRET directly (see backend src/routes/admin.ts).
export const operatorOnly = [
  'translate_owner_answer', 'escalation_remind_minutes', 'escalation_close_minutes',
  'deferred_max_age_hours', 'context_message_count',
  'context_retention_hours', 'history_fetch_limit', 'history_max_characters', 'history_timeout_seconds', 'lid_lookup_timeout_seconds', 'lid_backfill_pause_ms', 'knowledge_full_context_chars', 'knowledge_unit_max_chars', 'knowledge_similarity_floor', 'message_retention_days', 'intent_confidence_threshold',
  'inbound_quiet_seconds',
  'outbound_typing_min_seconds', 'outbound_typing_max_seconds',
  'outbound_typing_seconds_per_100_min', 'outbound_typing_seconds_per_100_max',
  'outbound_conversation_gap_min_seconds', 'outbound_conversation_gap_max_seconds',
  'outbound_proactive_gap_min_seconds', 'outbound_proactive_gap_max_seconds',
  'outbound_reminder_spread_minutes', 'daily_proactive_limit', 'outbound_retry_delays_seconds', 'outbound_retention_days',
  'route_stickiness_hours', 'reception_max_messages', 'campaign_routes', 'source_routes',
  'simulator_hourly_limit', 'simulator_daily_limit', 'templates',
  'semantic_repeat_threshold', 'repeat_window', 'request_offer_turns', 'cta_min_gap_turns',
  'reply_engine', 'reply_model', 'reply_max_output_tokens', 'reply_retry_max_output_tokens', 'reply_thinking_levels', 'request_required_fields', 'demo_max_turns', 'owner_interview_first_batch', 'owner_interview_daily_limit', 'knowledge_voice_max_seconds', 'knowledge_voice_hourly_limit', 'knowledge_voice_daily_limit',
  'knowledge_mode', 'fact_duplicate_threshold', 'facts_search_results', 'source_text_max_chars', 'extraction_chunk_chars', 'link_timeout_seconds', 'link_max_bytes', 'link_max_pages', 'audit_max_open_cards',
];

// Billing / tariff fields: operator-only and handled by PATCH /api/admin/usage-limits.
export const system = ['messages_per_month', 'voice_minutes_per_month', 'warning_percent', 'plan'];
