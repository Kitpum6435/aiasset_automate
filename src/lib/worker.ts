import { PrismaClient } from "@prisma/client";
import axios from "axios";
import fs from "fs";
import path from "path";

// ✅ ให้ TypeScript รู้จัก globalThis.automationSettings
export {};
declare global {
  // eslint-disable-next-line no-var
  var automationSettings: {
    isRunning: boolean;
    selectedRatio?: string;
    lastRun?: string;
  };
}

// ✅ กำหนดค่าเริ่มต้นให้ globalThis
globalThis.automationSettings = globalThis.automationSettings || {
  isRunning: true,
  selectedRatio: "1:1",
};

const prisma = new PrismaClient();

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function generateNextImage() {
  if (!globalThis.automationSettings?.isRunning) return;

  const prompt = await prisma.aiasset_automate.findFirst({
    where: { image_file: "", status: "waiting" },
    orderBy: { createdAt: "asc" },
  });

  if (!prompt) return;

  try {
    const versionId = "352185dbc99e9dd708b78b4e6870e3ca49d00dc6451a32fc6dd57968194fae5a"; // flux-1.1-pro-ultra

    const prediction = await axios.post(
      `https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro-ultra/versions/${versionId}/predictions`,
      {
        input: {
          prompt: prompt.prompts,
          aspect_ratio: globalThis.automationSettings.selectedRatio || "1:1",
        },
      },
      {
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    let result = prediction.data;
    while (result.status !== "succeeded" && result.status !== "failed") {
      await new Promise((r) => setTimeout(r, 1500));
      const poll = await axios.get(
        `https://api.replicate.com/v1/predictions/${result.id}`,
        {
          headers: {
            Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
          },
        }
      );
      result = poll.data;
    }

    if (result.status === "succeeded") {
      const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;
      const imageBuffer = await axios.get(outputUrl, { responseType: "arraybuffer" });

      const slug = slugify(prompt.image_title);
      const timestamp = Math.floor(Date.now() / 1000);
      const fileName = `${slug}-${timestamp}.jpg`;

      const saveDir = path.join(process.cwd(), "public", "medias", "ai", "stock-asset");
      if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });

      const savePath = path.join(saveDir, fileName);
      await fs.promises.writeFile(savePath, imageBuffer.data);

      await prisma.aiasset_automate.update({
        where: { id: prompt.id },
        data: {
          image_file: `/medias/ai/stock-asset/${fileName}`,
          create_image_dt: { generated_at: new Date().toISOString() },
          response: result,
          resize_image_cover: `/storage/app/ai/stock-asset/${slug}-${timestamp}-cover.jpg`,
          resize_image_thumb: `/storage/app/ai/stock-asset/${slug}-${timestamp}-thumb.jpg`,
          status: "completed",
        },
      });

      globalThis.automationSettings.lastRun = new Date().toISOString();
    } else {
      await prisma.aiasset_automate.update({
        where: { id: prompt.id },
        data: { status: "failed" },
      });
    }
  } catch (e) {
    console.error("🔥 Worker error:", e);
  }
}

// ✅ วนรอบทุก 5 วินาที
setInterval(() => {
  generateNextImage().catch(console.error);
}, 5000);
