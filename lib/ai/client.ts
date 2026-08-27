import type { z } from "zod";

export const DEFAULT_OPENROUTER_MODEL = "dots-studio/dots-3-note-preview:free";

type VisionRequest<T> = {
  task: string;
  system: string;
  userText: string;
  images?: string[];
  schema: z.ZodType<T>;
};

type OpenRouterResponse = {
  model?: string;
  choices?: Array<{ message?: { content?: string | Array<{ type: string; text?: string }> } }>;
  error?: { message?: string };
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

export type AIRequestMetric = {
  task: string;
  requestedModel: string;
  resolvedModel?: string;
  durationMs: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  attempt: number;
};

const benchmarkMetrics: AIRequestMetric[] = [];

export function consumeBenchmarkMetrics(): AIRequestMetric[] {
  return benchmarkMetrics.splice(0, benchmarkMetrics.length);
}

export class AIProviderError extends Error {
  constructor(message: string, public readonly status = 502) {
    super(message);
    this.name = "AIProviderError";
  }
}

export async function requestStructuredAI<T>({
  task,
  system,
  userText,
  images = [],
  schema,
}: VisionRequest<T>): Promise<T> {
  const apiKey = cleanSecret(process.env.OPENROUTER_API_KEY);
  if (!apiKey) {
    throw new AIProviderError(
      "OpenRouter is not configured. Add OPENROUTER_API_KEY to .env.local and restart the server.",
      503,
    );
  }

  const content: Array<Record<string, unknown>> = [{ type: "text", text: userText }];
  for (const imageUrl of images) {
    content.push({ type: "image_url", image_url: { url: imageUrl, detail: "high" } });
  }

  const started = performance.now();
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.OPENROUTER_APP_URL || "http://localhost:3000",
          "X-Title": process.env.OPENROUTER_APP_NAME || "VedaAI Assessment Mapper",
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL,
          temperature: 0.1,
          messages: [
            { role: "system", content: system },
            { role: "user", content },
          ],
          ...(attempt === 0 ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: AbortSignal.timeout(120_000),
      });

      const payload = (await response.json()) as OpenRouterResponse;
      if (!response.ok) {
        const detail = payload.error?.message || `OpenRouter returned HTTP ${response.status}`;
        if (response.status === 429) throw new AIProviderError("The free AI model is rate-limited. Wait briefly or choose another OpenRouter model.", 429);
        throw new AIProviderError(detail, response.status >= 500 ? 502 : response.status);
      }

      const raw = contentToText(payload.choices?.[0]?.message?.content);
      const parsed = schema.safeParse(parseJsonObject(raw));
      if (!parsed.success) {
        throw new AIProviderError(`The model returned invalid ${task} data: ${parsed.error.issues[0]?.message || "schema mismatch"}`);
      }

      if (process.env.AI_BENCHMARK_LOGS === "true") {
        const metric: AIRequestMetric = {
          task,
          requestedModel: process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL,
          resolvedModel: payload.model,
          durationMs: Math.round(performance.now() - started),
          promptTokens: payload.usage?.prompt_tokens,
          completionTokens: payload.usage?.completion_tokens,
          totalTokens: payload.usage?.total_tokens,
          attempt: attempt + 1,
        };
        benchmarkMetrics.push(metric);
        console.info(JSON.stringify({ type: "ai_benchmark", ...metric }));
      }
      return parsed.data;
    } catch (error) {
      lastError = error;
      if (error instanceof AIProviderError && (error.status === 429 || error.status === 503)) break;
    }
  }

  if (lastError instanceof AIProviderError) throw lastError;
  if (lastError instanceof Error && lastError.name === "TimeoutError") {
    throw new AIProviderError("The AI request timed out. Try fewer pages or a faster vision model.", 504);
  }
  throw new AIProviderError(lastError instanceof Error ? lastError.message : "The AI request failed.");
}

function cleanSecret(value: string | undefined): string {
  const trimmed = value?.trim() || "";
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function contentToText(content: string | Array<{ type: string; text?: string }> | undefined): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => part.text || "").join("");
  throw new AIProviderError("The model returned an empty response.");
}

function parseJsonObject(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new AIProviderError("The model did not return JSON.");
  }
}
