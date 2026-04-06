import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET() {
  const { userId } = auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("generation_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      history: data.map((item) => ({
        id: item.id,
        prompt: item.prompt,
        size: item.size,
        createdAt: new Date(item.created_at).getTime(),
        imageDataUrl: item.image_data_url,
        styleAnalysis: item.style_analysis,
        sourcePageUrl: item.source_page_url,
      })),
    });
  } catch (error) {
    console.error("Get history error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get history" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const { userId } = auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id } = body;

    if (id) {
      const { error } = await supabaseAdmin
        .from("generation_history")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("generation_history")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete history error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete history" },
      { status: 500 }
    );
  }
}
