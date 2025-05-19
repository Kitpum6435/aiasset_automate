// /app/api/history/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const data = await prisma.generatedImage.findMany({
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(data);
}
