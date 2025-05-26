import { PrismaClient } from "@prisma/client";
import axios from "axios";
import sharp from "sharp";
import { uploadToR2 } from "@/lib/r2";

const prisma = new PrismaClient();

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function generateNextImage(ratio: string) {
  const item = await prisma.aiasset_automate.findFirst({
    where: {
      OR: [{ image_file: null }, { image_file: "" }],
      status: "waiting",
    },
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
    await prisma.aiasset_automate.update({
      where: { id: item.id },
      data: { status: "failed" },
    });
    return null;
  }

  const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;
  const imageResponse = await axios.get(outputUrl, { responseType: "arraybuffer" });
  const originalBuffer = Buffer.from(imageResponse.data);

  const slug = slugify(item.image_title);
  const timestamp = Math.floor(Date.now() / 1000);
  const baseName = `medias/ai/stock-asset/${slug}-${timestamp}`;

  // ✅ Resize รูป
  const coverBuffer = await sharp(originalBuffer).resize(1200, 675).jpeg().toBuffer(); // 16:9
  const thumbBuffer = await sharp(originalBuffer).resize(400, 225).jpeg().toBuffer();  // preview

  // ✅ อัปโหลดขึ้น R2
  const originalUrl = await uploadToR2(`${baseName}.jpg`, originalBuffer);
  const coverUrl = await uploadToR2(`${baseName}-cover.jpg`, coverBuffer);
  const thumbUrl = await uploadToR2(`${baseName}-thumb.jpg`, thumbBuffer);

  // ✅ อัปเดต DB
  await prisma.aiasset_automate.update({
    where: { id: item.id },
    data: {
      image_file: originalUrl,
      response: result,
      status: "completed",
      create_image_dt: { generated_at: new Date().toISOString() },
      resize_image_cover: coverUrl,
      resize_image_thumb: thumbUrl,
    },
  });

  console.log(`✅ Image uploaded: ${originalUrl}`);
  return originalUrl;
}
