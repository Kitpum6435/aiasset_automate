import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const setting = await prisma.automationSetting.findUnique({ where: { id: 1 } });
    return NextResponse.json({
      isRunning: setting?.isRunning ?? false,
      ratio: setting?.ratio ?? "6:9",
      lastRun: setting?.updatedAt ?? null,
    });
  } catch (err) {
    console.error("❌ Status API Error:", err);
    return NextResponse.json({ isRunning: false, ratio: "1:1", lastRun: null });
  }
}