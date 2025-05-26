import { NextRequest, NextResponse } from "next/server";
import { generateBatchPrompts } from "@/lib/batchImageGenerator"; // <- เปลี่ยนชื่อ function รองรับ count

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const count = Number(body.count) || 20; // fallback เป็น 20 ถ้าไม่มีค่า

    console.log(`🚀 กำลัง generate จำนวน ${count} รูป`);

    await generateBatchPrompts(count);

    return NextResponse.json({
      success: true,
      message: `Batch generation (${count} images) started`,
    });
  } catch (error) {
    console.error("❌ Error in batch generation:", error);
    return NextResponse.json(
      { success: false, error: "Batch generation failed" },
      { status: 500 }
    );
  }
}
