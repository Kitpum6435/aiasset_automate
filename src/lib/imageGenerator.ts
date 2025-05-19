import { PrismaClient } from "@prisma/client";
import axios from "axios";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function generateNextImage(ratio: string) {
  const item = await prisma.generatedImage.findFirst({
    where: { image_file: "", status: "waiting" },
    orderBy: { createdAt: "asc" },
  });
  if (!item) return null;

  console.log(`🚀 Generating image for: ${item.image_title}`);

  const versionId = "352185dbc99e9dd708b78b4e6870e3ca49d00dc6451a32fc6dd57968194fae5a";
  const model = "black-forest-labs/flux-1.1-pro-ultra";

  const prediction = await axios.post(
    `https://api.replicate.com/v1/models/${model}/versions/${versionId}/predictions`,
    {
      input: {
        prompt: item.prompts,
        aspect_ratio: ratio,
        raw: false,
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

  if (result.status !== "succeeded") {
    await prisma.generatedImage.update({ where: { id: item.id }, data: { status: "failed" } });
    return null;
  }

  const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;
  const imageBuffer = await axios.get(outputUrl, { responseType: "arraybuffer" });

  const slug = slugify(item.image_title);
  const timestamp = Math.floor(Date.now() / 1000);
  const fileName = `${slug}-${timestamp}.jpg`;
  const saveDir = path.join(process.cwd(), "public", "medias", "ai", "stock-asset");
  if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });

  const fullPath = path.join(saveDir, fileName);
  await fs.promises.writeFile(fullPath, imageBuffer.data);

  await prisma.generatedImage.update({
    where: { id: item.id },
    data: {
      image_file: `/medias/ai/stock-asset/${fileName}`,
      response: result,
      status: "completed",
      create_image_dt: { generated_at: new Date().toISOString() },
      resize_image_cover: `/medias/ai/stock-asset/${slug}-${timestamp}-cover.jpg`,
      resize_image_thumb: `/medias/ai/stock-asset/${slug}-${timestamp}-thumb.jpg`,
    },
  });

  console.log(`✅ Image saved: ${fileName}`);
  return fileName;
}


