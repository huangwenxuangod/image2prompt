import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { analyzeImageWithVision } from "@/lib/ark";
import { checkAndIncrementUsage } from "@/lib/usage";

export async function POST(request: Request) {
  const { userId } = auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { imageBase64, mediaType, imageAlt } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: "Missing imageBase64" }, { status: 400 });
    }

    const canProceed = await checkAndIncrementUsage(userId, "image_analysis");
    if (!canProceed) {
      return NextResponse.json(
        { error: "Monthly analysis quota exceeded" },
        { status: 429 }
      );
    }

    const result = await analyzeImageWithVision(
      imageBase64,
      mediaType || "image/png",
      imageAlt || ""
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
