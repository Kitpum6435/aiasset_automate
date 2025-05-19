import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const prompts = await prisma.generatedImage.findMany({
    where: { imageFile: "" },
    take: 10,
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json(prompts);
}
