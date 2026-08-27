import { extractAnswerBlocks } from "@/lib/ai/extraction";
import { apiError, parseBody } from "@/lib/http";
import { PagesRequestSchema } from "@/lib/schemas";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const { pages } = await parseBody(request, PagesRequestSchema);
    const answerBlocks = await extractAnswerBlocks(pages);
    return NextResponse.json({ answerBlocks });
  } catch (error) {
    return apiError(error);
  }
}
