# Traklify

Starter app with Next.js App Router, shadcn/ui, Tailwind CSS, and Supabase.

## Prerequisites

- Node.js 20+
- npm 10+

## Environment Variables

Copy `.env.example` to `.env.local` and provide your project values:

```bash
cp .env.example .env.local
```

Required keys:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` - server-only, required for the staff invite flow (Project Settings -> API -> `service_role` key). Never prefix this with `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_SITE_URL` - base URL used to build the staff invite redirect link (e.g. `http://localhost:3000`, or your production domain).

## Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase Notes

- Server client helper: `src/utils/supabase/server.ts`
- Browser client helper: `src/utils/supabase/client.ts`
- Service-role (admin) client, server-only: `src/utils/supabase/admin.ts`
- Session refresh in proxy: `src/proxy.ts` + `src/utils/supabase/middleware.ts`
- Session + profile lookup helper: `src/utils/supabase/session.ts`

## Account structure

Admins sign up via the public login page and own an isolated set of locations,
staff, and clients. Staff are invited by an admin and assigned to one location
at a time; clients are added by admins and always belong to one location.
Reassigning either is done via drag-and-drop on `/dashboard/board`.

### Applying the database schema

The schema lives in `supabase/migrations/` and has **not** been applied to
any live project yet. To set it up:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Or paste the contents of each file into the Supabase Dashboard's SQL editor,
in order: `0001_account_structure.sql`, `0002_row_level_security.sql`,
`0003_profiles_self_insert.sql`, `0004_fix_rls_recursion.sql`,
`0005_grant_auth_admin_access.sql`, `0006_grant_auth_admin_execute.sql`,
`0007_fix_status_cast.sql`.

### Configuring staff invites

1. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (see above).
2. In Supabase Dashboard -> Authentication -> URL Configuration, add
   `${NEXT_PUBLIC_SITE_URL}/auth/accept-invite` (e.g.
   `http://localhost:3000/auth/accept-invite`) to the Redirect URLs allowlist.
3. In Supabase Dashboard -> Authentication -> Emails -> SMTP Settings,
   configure a custom SMTP provider (e.g. Resend). Without this, Supabase's
   default shared email sender is capped at ~2 emails/hour project-wide
   (across signups, invites, and password resets combined), which is easy to
   exhaust while testing and looks like "invite emails just stop going out."
4. Invite staff from `/dashboard/staff` once at least one location exists.

### Key routes

- `/dashboard` - overview, branches by role
- `/dashboard/locations` - admin only
- `/dashboard/staff` - admin only, invite + reassign + remove staff
- `/dashboard/clients` - admin manages all clients, staff see their location's clients
- `/dashboard/board` - admin only, drag-and-drop staff/client reassignment
- `/auth/accept-invite` - where invited staff set their password
