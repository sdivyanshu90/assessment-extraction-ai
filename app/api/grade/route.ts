import { gradeMappedAnswers } from "@/lib/ai/grading";
import { apiError, parseBody } from "@/lib/http";
import { GradeRequestSchema } from "@/lib/schemas";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const { questions, mappings } = await parseBody(request, GradeRequestSchema);
    const grades = await gradeMappedAnswers(questions, mappings);
    return NextResponse.json({ grades });
  } catch (error) {
    return apiError(error);
  }
}
