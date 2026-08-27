import { extractQuestions } from "@/lib/ai/extraction";
import { apiError, parseBody, RequestError } from "@/lib/http";
import { PagesRequestSchema } from "@/lib/schemas";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const { pages } = await parseBody(request, PagesRequestSchema);
    const questions = await extractQuestions(pages);
    if (!questions.length) throw new RequestError("No questions were detected. Check that the question paper is legible and try again.", 422);
    return NextResponse.json({ questions });
  } catch (error) {
    return apiError(error);
  }
}
