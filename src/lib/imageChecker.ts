import sharp from "sharp";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const MAX_FAILS = 10;
let consecutiveFails = 0;

export async function isImageCorrupted(imagePath: string): Promise<boolean> {
  try {
    const image = sharp(imagePath);
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    const pixelSize = info.channels;
    const firstPixel = data.slice(0, pixelSize);
    const isUniform = data.every((value, index) => value === firstPixel[index % pixelSize]);
    return isUniform;
  } catch {
    return true;
  }
}

export async function handleFailedGeneration(id: number) {
  await prisma.aiasset_automate.update({ where: { id }, data: { status: "failed" } });
  consecutiveFails++;
  if (consecutiveFails >= MAX_FAILS) {
    await prisma.automationSetting.update({ where: { id: 1 }, data: { isRunning: false } });
  }
}

export function resetFailCount() {
  consecutiveFails = 0;
}