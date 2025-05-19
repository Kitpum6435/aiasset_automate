import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { ratio } = await req.json();
    await prisma.automationSetting.upsert({
      where: { id: 1 },
      update: { isRunning: true, ratio },
      create: { isRunning: true, ratio, updatedAt: new Date() }
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Play API Error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
