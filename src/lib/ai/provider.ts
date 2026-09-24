import "server-only";

const OPENROUTER_API_BASE = "https://openrouter.ai/api/v1";

export type GeminiGenerateOptions = {
  systemInstruction?: string;
  prompt: string;
  json?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
};

function getApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing.");
  }

  return apiKey;
}

export async function generateWithOpenRouter({
  systemInstruction,
  prompt,
  json = false,
  temperature = 0.2,
  maxOutputTokens = 1200,
}: GeminiGenerateOptions): Promise<string> {
  const apiKey = getApiKey();

  const model =
    process.env.OPENROUTER_MODEL ||
    "inclusionai/ling-3.0-flash-sante:free";

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

  let finalPrompt = prompt;

   if (json) {
  finalPrompt =
    prompt +
    `

Return ONLY valid JSON.

Do not provide reasoning, analysis, chain-of-thought, or commentary.
Do not use markdown or code fences.
Keep the JSON concise and directly answer the requested fields.`;
}

  messages.push({
    role: "user",
    content: finalPrompt,
  });

  console.log("OPENROUTER REQUEST:", {
    model,
    json,
    temperature,
    maxOutputTokens,
  });

  const response = await fetch(
    `${OPENROUTER_API_BASE}/chat/completions`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://heloraa-clinic.vercel.app",
        "X-Title": "Heloraa Clinic",
      },

      body: JSON.stringify({
      model,
      messages,
      temperature,
       max_tokens: Math.max(maxOutputTokens, 2000),
      stream: false,
      }),
      cache: "no-store",

      signal: AbortSignal.timeout(30_000),
    }
  );

  const rawResponse = await response.text();

  if (!response.ok) {
    console.error("OPENROUTER ERROR:", {
      status: response.status,
      statusText: response.statusText,
      body: rawResponse.slice(0, 2000),
    });

    throw new Error(
      `OpenRouter request failed (${response.status}): ${
        rawResponse.slice(0, 500) || response.statusText
      }`
    );
  }

  let data: unknown;

  try {
    data = JSON.parse(rawResponse);
  } catch {
    console.error(
      "OPENROUTER INVALID JSON RESPONSE:",
      rawResponse.slice(0, 2000)
    );

    throw new Error(
      "OpenRouter returned an invalid JSON response."
    );
  }

  const content = extractAssistantText(data);

  if (!content) {
    console.error(
      "OPENROUTER EMPTY RESPONSE:",
      JSON.stringify(data).slice(0, 3000)
    );

    throw new Error(
      "OpenRouter returned an empty assistant response."
    );
  }

  if (json) {
    const cleaned = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      JSON.parse(cleaned);
    } catch {
      console.error(
        "OPENROUTER MALFORMED JSON OUTPUT:",
        cleaned.slice(0, 2000)
      );

      throw new Error(
        "OpenRouter returned malformed structured output."
      );
    }

    return cleaned;
  }

  return content;
}

function extractAssistantText(data: unknown): string {
  if (!data || typeof data !== "object") {
    return "";
  }

  const choices = (data as {
    choices?: unknown;
  }).choices;

  if (!Array.isArray(choices) || choices.length === 0) {
    return "";
  }

  const firstChoice = choices[0];

  if (!firstChoice || typeof firstChoice !== "object") {
    return "";
  }

  const message = (firstChoice as {
    message?: unknown;
  }).message;

  if (!message || typeof message !== "object") {
    return "";
  }

  const content = (message as {
    content?: unknown;
  }).content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (
          part &&
          typeof part === "object" &&
          typeof (part as { text?: unknown }).text === "string"
        ) {
          return (part as { text: string }).text;
        }

        return "";
      })
      .join("")
      .trim();
  }

  return "";
}