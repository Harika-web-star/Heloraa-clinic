import "server-only";

const EMBEDDING_DIMENSIONS = 768;

/** Remote Gemini embeddings avoid native ONNX dependencies in Vercel functions. */
export async function embedTexts(
  texts: string[],
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT",
): Promise<number[][]> {
  if (!texts.length) return [];
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Embedding provider is not configured.");
  const model = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";

  return Promise.all(texts.map(async (text) => {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        model: `models/${model}`,
        content: { parts: [{ text }] },
        taskType,
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Embedding provider request failed (${response.status}).`);
    const payload: unknown = await response.json();
    const values = payload && typeof payload === "object"
      ? (payload as { embedding?: { values?: unknown } }).embedding?.values
      : undefined;
    if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSIONS || !values.every((value) => typeof value === "number" && Number.isFinite(value))) {
      throw new Error("Embedding provider returned an invalid vector.");
    }
    return values as number[];
  }));
}
