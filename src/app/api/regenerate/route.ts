// ✅ File: /app/api/regenerate/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { id } = await req.json();

    // รีเซตข้อมูลให้เหมือน prompt ใหม่ และพร้อมให้ automation ทำงานต่อ
    const updated = await prisma.aiasset_automate.update({
      where: { id },
      data: {
        image_file: "",
        response: {},
        resize_image_cover: "",
        resize_image_thumb: "",
        create_prompt_dt: {},
        status: "waiting" // ✅ ให้ worker ตรวจเจอและ generate ต่อได้เลย
      },
    });

    return NextResponse.json({ success: true, updated });
  } catch (err) {
    console.error("❌ Regenerate API Error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
