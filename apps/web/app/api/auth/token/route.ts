import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId, getToken } = auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clerkToken = await getToken();

  return NextResponse.json({
    success: true,
    token: clerkToken,
    userId,
  });
}
