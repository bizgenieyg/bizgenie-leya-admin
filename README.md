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
- `/onboarding/step-3` connects WhatsApp through authenticated Next.js proxies and allows skipping to step 4.
- `/onboarding/step-4` lists tenant knowledge items and supports adding, editing, and deleting question/answer pairs. Finish navigates to `/admin`, including with zero FAQ.
- Tenant selection from step 1's session storage is verified against `tenant_users` for `auth.getUser()`. Without a stored selection, exactly one membership is required. All business reads, updates, and deletes explicitly filter `tenant_id`; inserts include it. Existing anon/Auth clients and RLS enforce access.

Schema source: backend `supabase/migrations/001_phase1_schema.sql` through `004_admin_onboarding_rls.sql`. No schema changes are required.

Columns used:
- `assistant_profiles`: `tenant_id`, `assistant_name`, `allowed_languages`, `tone`, `style_profile_md`.
- `knowledge_items`: `id`, `tenant_id`, `question`, `answer`, `type`, `language`, `active`, `source`, `created_at` (ordering). New items use `type='faq'`, `language='he'`, `active=true`, `source='manual'`; IDs and timestamps use database defaults. Editing preserves service fields.

Manual verification with an authenticated tenant account:
1. Open step 2, check saved profile values, reject a whitespace-only name, change fields, save, reopen and verify persistence.
2. Follow Next → Skip to step 4 (skipping does not create a WhatsApp session). Add a FAQ, reload, edit and reload, delete and reload; verify persistence after each operation.
3. Finish with zero FAQ and verify navigation to `/admin`.
4. Verify unauthenticated visits to steps 2–4 redirect to login. A foreign tenant ID in session storage must fail membership validation. Verify RLS separately using two authenticated tenant accounts.
5. Confirm denied or failed writes display errors and preserve form data.

TODO:
- Greeting has no column in `assistant_profiles` migrations 001–004, so no greeting input is implemented.
- `/admin` does not exist in this foundation yet; Finish targets that requested route, which currently returns 404. Dashboard implementation remains out of scope.


Automated tenant resolution checks: `node --test tests/onboarding-tenant.test.cjs` (mocked Auth and membership responses; these do not replace live RLS/CRUD verification).

## WhatsApp QR connection

Set these **server-only** variables in Vercel and redeploy:
- `LEIA_API_URL=https://leya.bizgenie.site`
- `LEIA_ADMIN_API_KEY`: the same value as backend `ADMIN_SECRET` (never use a `NEXT_PUBLIC_` prefix).

The browser calls only `/api/waha/create`, `/api/waha/status`, and `/api/waha/qr` on this Next.js app. Every route validates `auth.getUser()` using the existing Supabase SSR client and resolves the sole membership from `tenant_users` by authenticated `user_id`. Missing/ambiguous memberships and viewer roles are rejected. Client bodies/query parameters never select a tenant. Middleware is unchanged: the page is already protected, and API handlers perform their own authentication and return JSON 401 responses.

Backend contracts verified in `src/routes/admin.ts`, `src/utils/admin-auth.ts`, `src/services/waha-admin.service.ts`, and the WhatsApp provider:
- `POST /api/admin/waha/create`: JSON `{ tenantId }`; response `{ session, status: string }`.
- `GET /api/admin/waha/status?tenantId=...`: response `{ session, status: { status: string, connected?: boolean } }`.
- `GET /api/admin/waha/qr?tenantId=...`: binary image with backend Content-Type (provider requests PNG).
- All calls use `Authorization: Bearer <LEIA_ADMIN_API_KEY>`, accepted by backend `requireAdmin` against `ADMIN_SECRET`.

The proxy returns only normalized status or binary QR, disables caching, rejects upstream redirects, and limits each upstream fetch to 10 seconds. Logs contain only fixed event names, operation and HTTP status; no secrets, QR contents or raw upstream bodies. The create route also checks request Origin.

Click Connect to inspect/reuse an existing session or create/start one. Status polling runs every 3 seconds without overlapping requests, for at most 3 minutes per attempt. WORKING/CONNECTED stops polling and enables Next. Refresh QR fetches the current QR during a new polling attempt; Skip never creates a session. Navigation aborts pending browser requests and releases the QR object URL.

Checks: `npm run build`, `npm run lint`, `npm run typecheck`, `node --test tests/*.test.cjs`.

Live acceptance checks with an owner account: Connect → scan QR → Connected → Next; refresh QR before scanning; leave the page during polling; wait three minutes without scanning; verify Skip on a fresh visit creates no session. Confirm anonymous API calls return 401 and cross-origin create returns 403. Automated proxy tests mock Supabase and backend responses; they do not prove live WhatsApp pairing.

WhatsApp TODO:
- No endpoint forces QR regeneration; Refresh retrieves the currently available QR without disconnecting/restarting the session.
- Multi-tenant accounts need a server-side current-tenant selection mechanism; this implementation fails closed when membership is ambiguous.
- Configure the server environment in Vercel and run live pairing acceptance checks.
