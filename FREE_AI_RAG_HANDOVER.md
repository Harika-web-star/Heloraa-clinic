# AI and RAG handover

This note is retained as a pointer for the original integration handover. The current, maintained setup instructions are in [README.md](./README.md), [ARCHITECTURE.md](./ARCHITECTURE.md), and [DEPLOYMENT.md](./DEPLOYMENT.md).

Current provider split:

- Chat completions: OpenRouter (`OPENROUTER_API_KEY`, `OPENROUTER_MODEL`).
- Embeddings: Gemini API over HTTPS (`GEMINI_API_KEY`, optional `GEMINI_EMBEDDING_MODEL`).
- Vector storage and retrieval: Supabase Postgres with pgvector, 768 dimensions.

Embedding model changes require regeneration of vectors. The application tracks model names and refreshes stale vectors during the next patient RAG synchronization. Never commit `.env.local` or include it in project archives.
