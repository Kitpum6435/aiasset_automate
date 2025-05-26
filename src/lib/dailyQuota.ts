import { PrismaClient } from "@prisma/client";
import { startOfDay } from "date-fns";
const prisma = new PrismaClient();
const DAILY_LIMIT = 200;

export async function isQuotaExceeded(): Promise<boolean> {
  const todayStart = startOfDay(new Date());
  const count = await prisma.aiasset_automate.count({
    where: {
      createdAt: { gte: todayStart },
      status: "completed"
    }
  });
  return count >= DAILY_LIMIT;
}