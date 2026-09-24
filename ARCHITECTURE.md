# Architecture

```text
Browser
   ↓ Supabase session cookie / UI requests
Next.js App Router
   ↓ server components and API routes
Server services (authorization, appointments, AI routes)
   ↓ authenticated Supabase client or restricted service-role client
Supabase Auth + Postgres/RLS + pgvector
   ↓ scoped records and similarity retrieval
AI provider abstraction
   ├── OpenRouter chat completion → Medical Assistant / Records / Risk / Communication
   └── Gemini embedding REST API → 768-dimensional vectors
```

## Modules

- `src/app`: patient, doctor, admin pages and API routes; pages retain the existing visual design.
- `src/lib/supabase/client.ts`: browser client using publishable credentials.
- `src/lib/supabase/server.ts`: request-cookie client for server-side user auth and RLS.
- `src/lib/supabase/admin.ts`: server-only service-role client for n8n and explicitly privileged operations.
- `src/lib/ai/gemini.ts`: server-only OpenRouter chat and remote Gemini embedding adapters.
- `src/lib/ai/rag.ts`: record serialization, missing/stale embedding synchronization, and patient-scoped semantic retrieval.
- `supabase/migrations`: additive pgvector setup and retrieval RPC.

## Data relationships

`profiles.id` identifies an authenticated user. `patients.profile_id` and `doctors.profile_id` link role data to profiles. `patients.assigned_doctor_id` links patients to doctors. Medical records, medications, and appointments reference the patient; appointments also reference the doctor. Notifications and AI interactions reference users, and AI flags reference patients/doctors. `medical_record_embeddings.record_id` identifies the source medical record; its `patient_id` is required for RLS and retrieval scoping.

## RAG sequence

Medical records are represented as one document each. The server generates 768-dimensional Gemini embeddings, stores vectors in Supabase pgvector, and records the embedding model version. Queries are embedded with retrieval-query task type; `match_medical_record_embeddings` scopes results to the patient and authorized user. Agents receive retrieved document content; API responses expose source record IDs and similarity only. When embedding/retrieval fails, the route continues only where direct records are already available and reports that RAG was unavailable.
