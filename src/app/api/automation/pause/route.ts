import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await prisma.automationSetting.update({
      where: { id: 1 },
      data: { isRunning: false },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Pause API Error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
