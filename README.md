# Leia Admin

Next.js 14 App Router foundation for the Leia tenant admin panel.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Fill in the Supabase project URL, public anon key, and Leia backend URL.
3. Run `npm install`.
4. Run `npm run dev`.

The frontend must never receive a Supabase service-role key.

## Database handoff

`022_tenant_users.sql` is a standalone migration for the owner to review and apply to the Leia Supabase project. It is not applied by this repository.

## Checks

Run `npm run typecheck`, `npm run lint`, and `npm run build`.
