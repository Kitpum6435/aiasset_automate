import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const prompts = await prisma.aiasset_automate.findMany({
    where: { image_file: "" },
    take: 10,
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json(prompts);
}
