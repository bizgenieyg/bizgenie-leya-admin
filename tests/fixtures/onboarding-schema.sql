-- Relevant CREATE TABLE statements copied from backend 001_phase1_schema.sql.
-- Minimal Auth stand-in for isolated PostgreSQL/RLS tests only.
create role anon;
create role authenticated;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth to anon, authenticated;

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_name text,
  phone text not null,
  birthday date,
  language text default 'he',
  tier text default 'starter',
  status text default 'trial',
  trial_ends_at timestamptz,
  created_at timestamptz default now()
);

create table public.assistant_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants unique,
  assistant_name text default 'Лея',
  tone text default 'friendly_professional',
  mode text default 'assisted',
  allowed_languages text[] default array['he', 'ru', 'en'],
  system_rules text,
  style_profile_md text,
  created_at timestamptz default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants,
  phone text not null,
  name text,
  birthday date,
  language text,
  notes text,
  consent_given_at timestamptz,
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz,
  unique (tenant_id, phone)
);

create table public.client_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants,
  client_id uuid references public.clients unique,
  profile_md text,
  last_updated_at timestamptz default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants,
  client_id uuid references public.clients,
  status text default 'active',
  last_message_at timestamptz,
  created_at timestamptz default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations,
  tenant_id uuid references public.tenants,
  from_me boolean not null,
  body text,
  msg_type text default 'text',
  waha_msg_id text,
  raw_payload jsonb,
  created_at timestamptz default now()
);

create table public.knowledge_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants,
  type text not null,
  question text,
  answer text not null,
  language text default 'he',
  active boolean default true,
  source text default 'manual',
  created_at timestamptz default now()
);

create table public.module_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants,
  module_name text not null,
  enabled boolean default false,
  settings jsonb default '{}',
  limits jsonb default '{}',
  created_at timestamptz default now(),
  unique (tenant_id, module_name)
);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants,
  event_type text not null,
  quantity integer default 1,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create table public.agent_actions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants,
  conversation_id uuid references public.conversations,
  action_type text not null,
  input text,
  output text,
  ai_provider text,
  tokens_used integer,
  created_at timestamptz default now()
);

create table public.scheduled_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants,
  job_type text not null,
  payload jsonb default '{}',
  scheduled_at timestamptz not null,
  executed_at timestamptz,
  status text default 'pending',
  error text
);

alter table public.tenants alter column phone drop not null;
