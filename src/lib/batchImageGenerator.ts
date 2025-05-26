import { PrismaClient } from "@prisma/client";
import axios from "axios";
import sharp from "sharp";
import { uploadToR2 } from "@/lib/r2";
import { getRandomModel, getRandomRatio, generateTagsFromPrompt } from "./randomUtils";
import { handleFailedGeneration, resetFailCount } from "./imageChecker";

const prisma = new PrismaClient();

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ✅ เพิ่ม interface ให้ TypeScript รู้จัก structure ของแต่ละ item
interface AiAssetItem {
  id: number;
  image_title: string;
  prompts: string;
}

export async function generateBatchPrompts(count: number) {
  const items: AiAssetItem[] = await prisma.aiasset_automate.findMany({
    where: {
      OR: [{ image_file: null }, { image_file: "" }],
      status: "waiting",
    },
    orderBy: { createdAt: "asc" },
    take: count,
  });

  if (items.length === 0) {
    console.log("✅ ไม่มี prompt ที่รอการ generate แล้ว");
    return;
  }

  console.log(`🚀 เริ่ม generate รูปจำนวน ${items.length} รายการ...`);

  await prisma.aiasset_automate.updateMany({
    where: {
      id: {
        in: items.map((i) => i.id),
      },
    },
    data: { status: "processing" },
  });

  await Promise.all(items.map(async (item: AiAssetItem) => {
    const model = getRandomModel();
    const ratio = getRandomRatio();
    const tags = generateTagsFromPrompt(item.prompts);

    try {
      const res = await axios.post(
        `https://api.replicate.com/v1/models/${model.id}/predictions`,
        { input: { prompt: item.prompts, aspect_ratio: ratio } },
        { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` } }
      );

      let result = res.data;
      while (result.status !== "succeeded" && result.status !== "failed") {
        await new Promise((r) => setTimeout(r, 1500));
        const poll = await axios.get(
          `https://api.replicate.com/v1/predictions/${result.id}`,
          { headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` } }
        );
        result = poll.data;
      }

      if (result.status !== "succeeded") return handleFailedGeneration(item.id);

      const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;
      const imageResponse = await axios.get(outputUrl, { responseType: "arraybuffer" });
      const originalBuffer = Buffer.from(imageResponse.data);

      const slug = slugify(item.image_title);
      const timestamp = Date.now();
      const basePath = `medias/ai/stock-asset/${slug}-${timestamp}`;

      const coverBuffer = await sharp(originalBuffer).resize(1200, 675).jpeg().toBuffer();
      const thumbBuffer = await sharp(originalBuffer).resize(400, 225).jpeg().toBuffer();

      const imageUrl = await uploadToR2(`${basePath}.jpg`, originalBuffer);
      const coverUrl = await uploadToR2(`${basePath}-cover.jpg`, coverBuffer);
      const thumbUrl = await uploadToR2(`${basePath}-thumb.jpg`, thumbBuffer);

      await prisma.aiasset_automate.update({
        where: { id: item.id },
        data: {
          model: model.id,
          ratio,
          tags,
          image_file: imageUrl,
          response: result,
          status: "completed",
          create_image_dt: { generated_at: new Date().toISOString() },
          resize_image_cover: coverUrl,
          resize_image_thumb: thumbUrl,
        },
      });

      resetFailCount();
      console.log(`✅ สำเร็จ: ${slug}`);
    } catch (err) {
      console.error("❌ Generation error:", err);
      await handleFailedGeneration(item.id);
    }
  }));

  console.log("✅ เสร็จสิ้นการ generate ทั้ง batch\n");
}
