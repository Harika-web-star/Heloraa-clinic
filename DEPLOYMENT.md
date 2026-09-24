# Deployment

## Vercel

1. Import this project into Vercel with `heloraa-clinic-free-ai-rag` as the project root.
2. Add the variables in `.env.example` to the appropriate Vercel environment. Keep all keys server-side; only the Supabase URL and publishable key use `NEXT_PUBLIC_`.
3. Apply the Supabase migration before enabling AI routes.
4. Set `AUTOMATION_SECRET` in Vercel and the corresponding n8n credential.
5. Build with `npm run build` and deploy. Embeddings use the Gemini HTTPS API; the project no longer depends on ONNX Runtime or local model downloads.

## Supabase

Use the existing project and database. Apply `supabase/migrations/20260923_free_rag.sql`; it is additive and does not drop clinic data. It installs pgvector structures and policies for embeddings. Review the existing RLS policies on all clinic tables in the target project because the application relies on them for user-scoped reads. Use separate patient, assigned-doctor, and admin test accounts before release.

## Environment variables

See `.env.example`. Configure `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` for chat; configure `GEMINI_API_KEY` and optionally the embedding model for RAG. The default embedding model is `gemini-embedding-001` with the 768-dimension schema. Changing embedding models triggers record re-embedding by the route when it next synchronizes that patient's records.

## n8n

Set `AUTOMATION_SECRET` on both systems. Send it as a Bearer token to the appointment automation GET endpoint and to communication/log routes. Preserve existing route paths and JSON fields used by the workflow. Test the complete reminder workflow in a non-production Supabase project first.

## Troubleshooting

- Missing embedding key or provider quota: RAG status is unavailable; direct documented records may still be used by the relevant agent.
- Missing pgvector migration: embedding upsert or similarity RPC fails. Apply the migration and retry.
- Vercel environment mismatch: verify variables are configured for the deployment target (Preview/Production) and redeploy.
- Login redirects: verify a matching `profiles` row and supported role exist for the Supabase Auth user.
