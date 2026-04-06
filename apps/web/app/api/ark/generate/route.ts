import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fusePrompt, generateImage, generateId } from "@/lib/ark";
import { checkAndIncrementUsage } from "@/lib/usage";
import { supabaseAdmin } from "@/lib/supabase-server";
import type { ImageSize, ImageStyleAnalysis } from "@/lib/types";

export async function POST(request: Request) {
  const { userId } = auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { styleAnalysis, textContext, size, sourcePageUrl } = body;

    if (!textContext) {
      return NextResponse.json({ error: "Missing textContext" }, { status: 400 });
    }

    const canProceed = await checkAndIncrementUsage(userId, "image_generation");
    if (!canProceed) {
      return NextResponse.json(
        { error: "Monthly generation quota exceeded" },
        { status: 429 }
      );
    }

    const finalPrompt = await fusePrompt(styleAnalysis || null, textContext);
    const imageDataUrl = await generateImage(finalPrompt, (size as ImageSize) || "1024x1024");

    const historyItem = {
      id: generateId(),
      user_id: userId,
      prompt: finalPrompt,
      size: size || "1024x1024",
      image_data_url: imageDataUrl,
      style_analysis: styleAnalysis || null,
      source_page_url: sourcePageUrl || null,
    };

    await supabaseAdmin.from("generation_history").insert(historyItem);

    return NextResponse.json({
      success: true,
      finalPrompt,
      imageDataUrl,
      historyItem: {
        id: historyItem.id,
        prompt: historyItem.prompt,
        size: historyItem.size,
        createdAt: Date.now(),
        imageDataUrl: historyItem.image_data_url,
        sourcePageUrl: historyItem.source_page_url,
      },
    });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
