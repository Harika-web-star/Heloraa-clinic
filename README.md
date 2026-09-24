# Heloraa Clinic

Heloraa Clinic is a Next.js and Supabase multi-role clinic application for patients, doctors, and administrators. It includes appointments, medical records, notifications, AI assistance, clinical summaries, risk review, and n8n automation endpoints. The existing Heloraa interface and modular monolith are retained.

## Stack and module map

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS
- Supabase Auth, Postgres, row-level security, and pgvector
- OpenRouter for configurable chat completions; Gemini API for 768-dimensional embeddings
- n8n calls server-side automation routes

```text
src/app/{patient,doctor,admin}     Role dashboards and workflows
src/app/api/ai                    Assistant, records, risk, communication, appointments
src/app/api/automation             n8n integration routes
src/lib/ai                         Provider and shared RAG pipeline
src/lib/supabase                    Browser, cookie server, and service-role clients
supabase/migrations                 Database changes
```

## Local setup

1. Install Node.js supported by the installed Next.js version and run `npm install`.
2. Copy `.env.example` to `.env.local` and fill in values from Supabase and the AI providers.
3. Apply `supabase/migrations/20260923_free_rag.sql` in the Supabase SQL editor.
4. Run `npm run dev`; open `http://localhost:3000`.

See [DEPLOYMENT.md](./DEPLOYMENT.md), [ARCHITECTURE.md](./ARCHITECTURE.md), and [SECURITY.md](./SECURITY.md) before deploying.

## Supabase and authentication

Create Supabase Auth users and matching `profiles` rows with role `patient`, `doctor`, or `admin`; create the corresponding `patients` or `doctors` rows. The project expects existing tables: `profiles`, `patients`, `doctors`, `medical_records`, `medications`, `appointments`, `notifications`, `ai_interactions`, `ai_flags`, and `automation_logs`. Ensure RLS policies in the existing project restrict records and patient/doctor relationships. The migration adds `medical_record_embeddings` and a patient-scoped similarity RPC without renaming existing tables.

## AI and RAG

Chat generation uses `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`. Embedding requests use `GEMINI_API_KEY`, `GEMINI_EMBEDDING_MODEL`, and 768 output dimensions. Embeddings are created over server-side HTTP, so deployment does not load Hugging Face or ONNX native runtimes. RAG chunks each existing medical record as one searchable document, stores its source ID in pgvector metadata, retrieves by patient ID, and includes record IDs and similarity in assistant/doctor API responses. Old vectors are re-embedded when their `embedding_model` marker differs. An embedding failure is reported as RAG unavailable; the AI routes do not claim retrieval occurred.

AI output is a review aid. The doctor risk route validates the JSON flag shape and severity before persisting any flag. Do not use these outputs to diagnose or prescribe.

## n8n

The existing `/api/automation/appointments`, `/api/automation/communication`, and `/api/automation/log` routes remain available. Set the same `AUTOMATION_SECRET` in Vercel and n8n and send `Authorization: Bearer <secret>` for server-to-server calls. The automation appointment GET route uses the same secret. The patient appointment booking POST route uses the Supabase session and does not use this automation credential.

## Quality checks

`npm run lint` runs ESLint. `npm run build` runs the production Next.js build. Live Supabase, provider, role, and n8n behavior also requires configured external services and test accounts.
