# Security notes

- Supabase service-role access is server-only and bypasses RLS. Use the cookie-authenticated client for user workflows; reserve the admin client for operations that need elevated access.
- Protected page prefixes are role checked in `src/proxy.ts`. API routes must still perform their own authorization because proxy checks are not a substitute for endpoint authorization.
- Doctor AI summary/risk routes constrain the requested patient to `assigned_doctor_id`. Patient assistant data is selected using the authenticated user's patient profile.
- Embeddings and AI keys are server-only. Never prefix secret keys with `NEXT_PUBLIC_`; never place secrets in source, documentation, or archives.
- n8n routes that use service-role access require `AUTOMATION_SECRET` as a Bearer token. Rotate it if it is exposed.
- Provider calls contain relevant medical context. Configure providers only after reviewing applicable data-processing, retention, residency, and healthcare privacy requirements for the deployment.
- Avoid logging request bodies, prompts, record content, tokens, or provider response bodies. AI summaries and risk flags require clinician review and do not diagnose or prescribe.
- Review Supabase RLS for all application tables in the actual database. The included migration scopes embedding reads and similarity retrieval; it does not replace table-specific clinic policies.

## Pre-release access checks

Verify that a patient cannot request another patient's records, a doctor cannot request an unassigned patient, and a patient/doctor cannot use admin pages or n8n routes. Also confirm that service-role and AI variables are absent from client bundles and browser responses.
