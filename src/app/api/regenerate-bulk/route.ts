// /app/api/regenerate-bulk/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  await prisma.aiasset_automate.updateMany({
    data: {
      image_file: "",
      response: {},
      resize_image_cover: "",
      resize_image_thumb: "",
      create_prompt_dt: {},
      status: "waiting",
    }
  });

  return NextResponse.json({ message: "All prompts reset for regenerate." });
}
