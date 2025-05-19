// ✅ File: /app/api/regenerate/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { id } = await req.json();

    // รีเซตข้อมูลให้เหมือน prompt ใหม่ และพร้อมให้ automation ทำงานต่อ
    const updated = await prisma.generatedImage.update({
      where: { id },
      data: {
        imageFile: "",
        response: {},
        resizeImageCover: "",
        resizeImageThumb: "",
        createImageDt: {},
        status: "waiting" // ✅ ให้ worker ตรวจเจอและ generate ต่อได้เลย
      },
    });

    return NextResponse.json({ success: true, updated });
  } catch (err) {
    console.error("❌ Regenerate API Error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
