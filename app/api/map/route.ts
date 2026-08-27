import { mapAnswerBlocks } from "@/lib/ai/mapping";
import { apiError, parseBody } from "@/lib/http";
import { MappingRequestSchema } from "@/lib/schemas";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const { questions, answerBlocks } = await parseBody(request, MappingRequestSchema);
    const result = await mapAnswerBlocks(questions, answerBlocks);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
