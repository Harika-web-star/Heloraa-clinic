# Heloraa Clinic — code update and setup notes

This bundle contains the updated `src/` folder plus a forward-only signup-role security migration and an idempotent synthetic demo-data seed script. It is a source update, not a full standalone Next.js repository: keep your existing `package.json`, lockfile, Next config, and other root files.

## What changed

- `src/app/admin/page.tsx`: requires a signed-in user with `profiles.role = 'admin'` before any admin queries or service-role access; routes patients/doctors to their own dashboard; shows query failures instead of falsely showing zero data; uses India-local date for the appointment filter; avoids claiming AI activity is “live” or completed without a status field; displays the real `severity` field on AI flags; explains missing automation-log configuration.
- `src/app/login/page.tsx`: normalizes email, gives a clear unverified-email message, signs out when the Auth user has no accessible clinic profile, and refreshes routing after role redirects.
- Signup, password validation, forgot-password, and reset-password pages from the existing update are included.
- `supabase/migrations/20261022_secure_public_signup_role.sql`: prevents public signup metadata from assigning doctor/admin roles. Public signup creates patient accounts; staff roles are provisioned by a trusted administrator.
- `supabase/seed/heloraa_demo_seed.sql`: adds repeatable synthetic records for appointments, medical records, medications, AI interactions, AI flags, and automation logs.
- `heloraa_complete_supabase_setup.sql`: the fresh-install setup has the same public-signup role restriction.

## Environment variables

Set these in the server/deployment environment and locally in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; never prefix with `NEXT_PUBLIC_`, expose in client code, or commit its value.

Keep any existing AI-provider and n8n variables already used by the project.

## Supabase setup

### If creating a fresh Supabase project

1. Run `heloraa_complete_supabase_setup.sql` in the Supabase SQL Editor using a trusted database role.
2. Run `supabase/seed/heloraa_demo_seed.sql` to populate the synthetic dashboard data.
3. Configure Auth email delivery, the site URL, and allowed redirect URLs for your deployed domain and local development.

### If your existing database is already initialized

1. Run `supabase/migrations/20261022_secure_public_signup_role.sql` in the Supabase SQL Editor.
2. Run `supabase/seed/heloraa_demo_seed.sql` if you want the synthetic dashboard records.
3. Do **not** rerun the full fresh-install setup against a database that already has these tables; it is not a general-purpose upgrade migration.

### Email OTP template

The signup page asks for a six-digit email code using `verifyOtp({ type: 'signup' })`. Configure the Supabase confirmation email template to include the token, commonly `{{ .Token }}`, and verify your Auth email provider/SMTP settings. If the template sends only a confirmation link, the visible six-digit OTP form will not match that template.

For password recovery, allow the `/reset-password` redirect URL in Supabase Auth. Set your Auth password policy to match the UI: at least eight characters, lowercase, uppercase, number, and symbol. Client-side validation alone is not a server-side password policy.

## Provisioning the first administrator

1. Create and verify a real account through Supabase Auth / the app. Public signup creates a patient profile.
2. In the Supabase SQL Editor, run the following with the real administrator email substituted for the placeholder:

```sql
update public.profiles as p
set role = 'admin'
from auth.users as u
where p.id = u.id
  and lower(u.email) = lower('YOUR_ADMIN_EMAIL@example.com');
```

3. Confirm exactly one row was updated, then sign in again. Do not expose an admin-role selector in public signup.

The synthetic profiles created by the seed script are database demo records, **not** Supabase Auth accounts. They cannot sign in and have no passwords.

## Verification status / limits

I reviewed the source and made targeted edits, but this environment does not have your actual Supabase project credentials or full project root (`package.json` and lockfile were not part of the source ZIP). Therefore I could not verify email delivery, live database queries, n8n execution, or a full Next.js production build. After applying the files, run your project’s normal lint, type-check, and build commands, then test signup/OTP, login, reset-password, patient/doctor route protection, and admin access against your Supabase project.
