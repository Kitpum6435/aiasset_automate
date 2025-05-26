// /app/api/history/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const data = await prisma.aiasset_automate.findMany({
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(data);
}
