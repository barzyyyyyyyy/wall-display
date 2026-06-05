// Shared Gemini caller with automatic retry and model fallback.
// Used by /api/recipes/extract, /api/work/upload, /api/skincare/upload.

export type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

export type GenerationConfig = {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  /** When set, forces the model to return content matching this MIME type. */
  responseMimeType?: string;
  /** Explicit model fallback chain. Defaults to MODEL_ATTEMPTS_FLASH. */
  models?: string[];
};

const RETRY_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

// Default chain — for routine extraction (work, skincare). Flash is cheap and
// has a huge free quota.
const MODEL_ATTEMPTS_FLASH: string[] = [
  "gemini-2.5-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

/** High-accuracy chain for cases where hallucinating is dangerous (recipes).
 *  Pro is much better at handwriting and at refusing rather than confabulating. */
export const MODEL_ATTEMPTS_PRO: string[] = [
  "gemini-2.5-pro",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callGemini(
  parts: GeminiPart[],
  config: GenerationConfig = {},
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured on the server");
  }

  const generationConfig: Record<string, unknown> = {};
  if (typeof config.temperature === "number")
    generationConfig.temperature = config.temperature;
  if (typeof config.topP === "number") generationConfig.topP = config.topP;
  if (typeof config.topK === "number") generationConfig.topK = config.topK;
  if (typeof config.maxOutputTokens === "number")
    generationConfig.maxOutputTokens = config.maxOutputTokens;
  if (config.responseMimeType)
    generationConfig.response_mime_type = config.responseMimeType;

  const body: Record<string, unknown> = {
    contents: [{ parts }],
  };
  if (Object.keys(generationConfig).length > 0) {
    body.generationConfig = generationConfig;
  }

  const models = config.models ?? MODEL_ATTEMPTS_FLASH;

  let lastStatus = 0;
  let lastBody = "";

  for (let i = 0; i < models.length; i++) {
    if (i > 0) {
      // Backoff: 0.5s, 1s, 1.5s
      await sleep(500 * Math.min(i, 3));
    }

    const model = models[i];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    }

    lastStatus = res.status;
    lastBody = await res.text().catch(() => "");

    // Hard error (bad request, auth, etc) — don't waste retries
    if (!RETRY_STATUSES.has(res.status)) {
      throw new Error(`Gemini HTTP ${res.status}: ${lastBody.slice(0, 200)}`);
    }
  }

  if (lastStatus === 503 || lastStatus === 429) {
    throw new Error(
      "השירות עמוס כרגע. נסה שוב בעוד דקה — בדרך כלל זה חולף תוך כמה רגעים.",
    );
  }
  throw new Error(
    `Gemini HTTP ${lastStatus}: ${lastBody.slice(0, 200)}`,
  );
}
