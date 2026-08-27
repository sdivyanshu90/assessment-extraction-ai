import { AIProviderError } from "@/lib/ai/client";
import { NextResponse } from "next/server";
import type { z } from "zod";

export async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const body = await request.json().catch(() => null);
  const result = schema.safeParse(body);
  if (!result.success) throw new RequestError(`Invalid request: ${result.error.issues[0]?.message || "schema mismatch"}`, 400);
  return result.data;
}

export function apiError(error: unknown) {
  if (error instanceof AIProviderError || error instanceof RequestError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("API operation failed", error instanceof Error ? error.message : "Unknown error");
  return NextResponse.json({ error: "Processing failed unexpectedly. Please try again." }, { status: 500 });
}

export class RequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}
