import { PrismaClient } from "@prisma/client";
import axios from "axios";
import fs from "fs";
import path from "path";


const prisma = new PrismaClient();

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function generateNextImage() {
  if (!globalThis.automationSettings?.isRunning) return;

  const prompt = await prisma.generatedImage.findFirst({
    where: { imageFile: "", status: "waiting" },
    orderBy: { createdAt: "asc" },
  });

  if (!prompt) return;

  try {
    const versionId = "352185dbc99e9dd708b78b4e6870e3ca49d00dc6451a32fc6dd57968194fae5a";
    const prediction = await axios.post(
      `https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro-ultra/versions/${versionId}/predictions`,
      {
        input: {
          prompt: prompt.prompts,
          aspect_ratio: globalThis.automationSettings?.selectedRatio || "1:1",
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

      const slug = slugify(prompt.imageTitle);
      const timestamp = Math.floor(Date.now() / 1000);
      const fileName = `${slug}-${timestamp}.jpg`;
      const saveDir = path.join(process.cwd(), "public", "medias", "ai", "stock-asset");
      if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });

      const savePath = path.join(saveDir, fileName);
      await fs.promises.writeFile(savePath, imageBuffer.data);

      await prisma.generatedImage.update({
        where: { id: prompt.id },
        data: {
          imageFile: `/medias/ai/stock-asset/${fileName}`,
          createImageDt: { generated_at: new Date().toISOString() },
          response: result,
          resizeImageCover: `/storage/app/ai/stock-asset/${slug}-${timestamp}-cover.jpg`,
          resizeImageThumb: `/storage/app/ai/stock-asset/${slug}-${timestamp}-thumb.jpg`,
          status: "completed",
        },
      });

      globalThis.automationSettings.lastRun = new Date().toISOString();
    } else {
      await prisma.generatedImage.update({ where: { id: prompt.id }, data: { status: "failed" } });
    }
  } catch (e) {
    console.error("🔥 Worker error:", e);
  }
}

// ✅ Auto-run loop every 5 sec
setInterval(() => {
  generateNextImage().catch(console.error);
}, 5000);