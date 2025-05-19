// /app/api/regenerate-bulk/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  await prisma.generatedImage.updateMany({
    data: {
      imageFile: "",
      response: {},
      resizeImageCover: "",
      resizeImageThumb: "",
      createImageDt: {},
      status: "waiting",
    }
  });

  return NextResponse.json({ message: "All prompts reset for regenerate." });
}
