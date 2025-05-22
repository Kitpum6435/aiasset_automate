import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { isQuotaExceeded } from "../src/lib/dailyQuota";
import { generateBatch20Prompts } from "../src/lib/batchImageGenerator";

const prisma = new PrismaClient();

cron.schedule("*/5 * * * * *", async () => {
  console.log("🔄 Cron ทำงาน: ตรวจสอบสถานะระบบ...");

  const setting = await prisma.automationSetting.findUnique({ where: { id: 1 } });
  if (!setting?.isRunning) {
    console.log("⏸ หยุดการทำงาน ");
    return;
  }

  if (await isQuotaExceeded()) {
    console.log("🚫 เกิน quota ประจำวัน หยุดการทำงาน");
    await prisma.automationSetting.update({ where: { id: 1 }, data: { isRunning: false } });
    return;
  }

  await generateBatch20Prompts();
});
