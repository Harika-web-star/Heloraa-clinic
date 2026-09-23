import { pipeline } from "@huggingface/transformers";

const GROQ_API_BASE = "https://api.groq.com/openai/v1";

let embeddingPipeline: Awaited<
  ReturnType<typeof pipeline>
> | null = null;

async function getEmbeddingPipeline() {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline(
      "feature-extraction",
      "Xenova/bge-base-en-v1.5",
      {
        dtype: "q8",
      }
    );
  }

  return embeddingPipeline;
}

export type GeminiGenerateOptions = {
  systemInstruction?: string;
  prompt: string;
  json?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
};

export async function generateWithGemini({
  systemInstruction,
  prompt,
  json = false,
  temperature = 0.2,
  maxOutputTokens = 1200,
}: GeminiGenerateOptions): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const model =
    process.env.GROQ_MODEL || "openai/gpt-oss-20b";

  const messages: Array<{
    role: "system" | "user";
    content: string;
  }> = [];

  if (systemInstruction) {
    messages.push({
      role: "system",
      content: systemInstruction,
    });
  }

  messages.push({
    role: "user",
    content: prompt,
  });

  const response = await fetch(
    `${GROQ_API_BASE}/chat/completions`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },

      body: JSON.stringify({
        model,
        messages,

        temperature,

        // IMPORTANT for GPT-OSS
        reasoning_effort: "low",
        include_reasoning: false,

        // Groq's current parameter for output tokens
        max_completion_tokens: maxOutputTokens,

        ...(json
          ? {
              response_format: {
                type: "json_object",
              },
            }
          : {}),

        stream: false,
      }),

      cache: "no-store",
    }
  );

  if (!response.ok) {
    const details = await response.text();

    throw new Error(
      `Groq API error (${response.status}): ${details}`
    );
  }

  const data = await response.json();

  console.log(
    "GROQ RESPONSE:",
    JSON.stringify(data, null, 2)
  );

  const message = data?.choices?.[0]?.message;

  // Normal final response
  const content = message?.content?.trim();

  if (content) {
    return content;
  }

  // Safety fallback in case Groq returns text elsewhere
  const reasoning = message?.reasoning?.trim();

  if (reasoning) {
    console.warn(
      "Groq returned reasoning but no content."
    );

    return reasoning;
  }

  throw new Error(
    `Groq returned an empty response. Full response: ${JSON.stringify(
      data
    )}`
  );
}

export async function embedTexts(
  texts: string[],
  taskType:
    | "RETRIEVAL_DOCUMENT"
    | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT"
): Promise<number[][]> {
  if (!texts.length) {
    return [];
  }

   const extractor = (await getEmbeddingPipeline()) as any;

  const preparedTexts = texts.map((text) =>
    taskType === "RETRIEVAL_QUERY"
      ? `Represent this sentence for searching relevant passages: ${text}`
      : text
  );

  const output = await extractor(preparedTexts, {
    pooling: "mean",
    normalize: true,
  });
  
  const vectors = output.tolist() as number[][];

  if (
    !Array.isArray(vectors) ||
    vectors.length !== texts.length
  ) {
    throw new Error(
      "Invalid local embedding response."
    );
  }

  for (const vector of vectors) {
    if (vector.length !== 768) {
      throw new Error(
        `Invalid embedding dimension. Expected 768, received ${vector.length}.`
      );
    }
  }

  return vectors;
}