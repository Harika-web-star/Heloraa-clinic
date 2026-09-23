# Heloraa Clinic — Free AI + RAG Handover

## What changed

The paid OpenAI integration has been removed from the application AI routes.

The application now uses:

- **LLM:** Google Gemini `gemini-3.5-flash-lite`
- **Embeddings:** Google Gemini `gemini-embedding-2` with 768-dimensional vectors
- **RAG store:** Supabase Postgres + `pgvector`
- **Existing database:** Supabase remains the source of truth
- **Existing frontend:** preserved, with small `Gemini + RAG` indicators added to the AI screens

No paid OpenAI subscription is required.

> The Gemini API has a free tier, but quotas can change and are not an unlimited/forever guarantee. Keep usage within the active free-tier limits.

## AI agents after migration

| Agent | LLM | RAG |
|---|---|---|
| Medical Assistant | Gemini | Yes — patient medical records |
| Medical Records Agent | Gemini | Yes — semantic retrieval + structured records |
| Risk Monitoring Agent | Gemini | Yes — semantic retrieval + structured records |
| Communication Agent | Gemini | No — it only needs the supplied notification context |
| Appointment Agent | Database logic | No LLM required |

## RAG flow

```text
Medical Record
     ↓
Gemini Embedding 2
     ↓
Supabase pgvector
     ↓
Patient question / doctor analysis request
     ↓
Query embedding
     ↓
Similarity search
     ↓
Relevant medical records
     ↓
Gemini LLM
     ↓
Grounded response
```

New medical records are automatically embedded the first time an AI route needs them. Existing embeddings are reused.

## Setup tonight

### 1. Create a free Gemini API key

Use Google AI Studio and create an API key.

Do NOT put the key in a `NEXT_PUBLIC_*` variable.

Use:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
GEMINI_EMBEDDING_DIMENSIONS=768
```

### 2. Configure Supabase

Open the Supabase Dashboard → SQL Editor.

Run:

```text
supabase/migrations/20260923_free_rag.sql
```

This:

- enables `pgvector`
- creates `medical_record_embeddings`
- adds the HNSW vector index
- adds RLS policies
- creates `match_medical_record_embeddings()`
- restricts retrieval to the patient, assigned doctor, or admin

### 3. Configure `.env.local`

Use the included `.env.example` as the template.

Example:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY

GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
GEMINI_EMBEDDING_DIMENSIONS=768
```

### 4. Install dependencies

Because the old project lockfile was generated with the OpenAI dependency, run:

```bash
npm install
```

Then:

```bash
npm run dev
```

Do not use the old OpenAI API key.

## What to test

### Patient

1. Log in as a patient.
2. Open **Medical Assistant**.
3. Ask something related to an existing medical record.
4. Confirm the answer appears.
5. The page should show `Gemini + RAG`.
6. The API response includes the retrieved record IDs.

### Doctor

1. Log in as a doctor.
2. Open a patient.
3. Run **AI Clinical Summary**.
4. Confirm the summary is generated.
5. Confirm the page shows `Gemini + RAG`.

Then:

1. Open **AI Risk Monitoring**.
2. Run the analysis.
3. Confirm either a review flag or "No review flag identified".
4. Confirm `Gemini + RAG` is shown.

### Communication

Trigger a notification through the existing communication flow.

The Communication Agent uses Gemini but intentionally does not perform RAG because it only needs the supplied notification context.

## Deployment

For Vercel or another Next.js host, add these server environment variables:

```text
GEMINI_API_KEY
GEMINI_MODEL
GEMINI_EMBEDDING_MODEL
GEMINI_EMBEDDING_DIMENSIONS
```

Keep the Gemini key server-side.

The Supabase public URL and publishable key can remain as the existing `NEXT_PUBLIC_*` variables.

## Important security action

The uploaded project contained an OpenAI secret key inside `.env.local`.

That key should be **revoked/rotated immediately** in the OpenAI dashboard.

The handover copy intentionally replaces the old secret with placeholders.

Never commit `.env.local` to Git.

## Healthcare/privacy note

This implementation is appropriate for a demo/freelance handover where the requirement is zero paid API cost.

Before using real production patient data, the client should independently review:

- data-processing/privacy terms of the selected AI provider
- applicable healthcare/privacy regulations
- whether external AI processing is permitted for their patient data
- retention and logging requirements
- clinical safety and human-review requirements

The AI agents are designed as clinical support/summarization tools and must not be treated as autonomous diagnosis or prescribing systems.
