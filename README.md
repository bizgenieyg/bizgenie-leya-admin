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

## Onboarding steps 2–4

- `/onboarding/step-2` loads and updates the existing assistant profile. Name is required; supported reply languages are selected as an array (`he`, `ru`, `en`). Tone and style are free text.
- `/onboarding/step-3` is a WhatsApp placeholder with a skip link to step 4.
- `/onboarding/step-4` lists tenant knowledge items and supports adding, editing, and deleting question/answer pairs. Finish navigates to `/admin`, including with zero FAQ.
- Tenant selection from step 1's session storage is verified against `tenant_users` for `auth.getUser()`. Without a stored selection, exactly one membership is required. All business reads, updates, and deletes explicitly filter `tenant_id`; inserts include it. Existing anon/Auth clients and RLS enforce access.

Schema source: backend `supabase/migrations/001_phase1_schema.sql` through `004_admin_onboarding_rls.sql`. No schema changes are required.

Columns used:
- `assistant_profiles`: `tenant_id`, `assistant_name`, `allowed_languages`, `tone`, `style_profile_md`.
- `knowledge_items`: `id`, `tenant_id`, `question`, `answer`, `type`, `language`, `active`, `source`, `created_at` (ordering). New items use `type='faq'`, `language='he'`, `active=true`, `source='manual'`; IDs and timestamps use database defaults. Editing preserves service fields.

Manual verification with an authenticated tenant account:
1. Open step 2, check saved profile values, reject a whitespace-only name, change fields, save, reopen and verify persistence.
2. Follow Next → Skip to step 4. Add a FAQ, reload, edit and reload, delete and reload; verify persistence after each operation.
3. Finish with zero FAQ and verify navigation to `/admin`.
4. Verify unauthenticated visits to steps 2–4 redirect to login. A foreign tenant ID in session storage must fail membership validation. Verify RLS separately using two authenticated tenant accounts.
5. Confirm denied or failed writes display errors and preserve form data.

TODO:
- Greeting has no column in `assistant_profiles` migrations 001–004, so no greeting input is implemented.
- `/admin` does not exist in this foundation yet; Finish targets that requested route, which currently returns 404. Dashboard implementation remains out of scope.
- WhatsApp connection remains the requested placeholder.

Automated tenant resolution checks: `node --test tests/onboarding-tenant.test.cjs` (mocked Auth and membership responses; these do not replace live RLS/CRUD verification).
