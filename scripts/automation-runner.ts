// ✅ File: scripts/automation-runner.ts

import { generateNextImage } from "@/lib/imageGenerator";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runWorkerLoop() {
  console.log("🚀 Background automation started...");

  while (true) {
    try {
      // ✅ ดึงสถานะ automation จาก DB (เช่น /api/play จะ set เป็น true)
      const setting = await prisma.automationSetting.findUnique({ where: { id: 1 } });

      if (!setting?.isRunning) {
        // ❌ หยุดชั่วคราวถ้ายังไม่ได้เริ่มทำงาน
        await delay(3000);
        continue;
      }

      // ✅ รันการสร้างภาพตาม ratio ที่เลือกไว้ (1:1, 16:9, ...)
      await generateNextImage(setting.ratio);

      // ✅ หน่วงเล็กน้อยเพื่อให้ background ไม่รันถี่เกินไป
      await delay(2000);
    } catch (err) {
      // ❌ หากมี error ระหว่างรัน ให้ log แล้วรอ 5 วิค่อยทำต่อ
      console.error("❌ Worker error:", err);
      await delay(5000);
    }
  }
}

// ฟังก์ชันหน่วงเวลา
function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

// ✅ เริ่มทำงาน background loop
runWorkerLoop()
  .catch((err) => {
    console.error("❌ Automation runner crashed:", err);
  })
  .finally(() => prisma.$disconnect());
