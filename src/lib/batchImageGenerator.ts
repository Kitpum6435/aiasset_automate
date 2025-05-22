import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { uploadToR2 } from "@/lib/r2"; // ต้องเขียนฟังก์ชันนี้แยกต่างหาก
import { getRandomModel, getRandomRatio, generateTagsFromPrompt } from "./randomUtils";
import { handleFailedGeneration, resetFailCount } from "./imageChecker";

const prisma = new PrismaClient();

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function generateBatch20Prompts() {
  const items = await prisma.generatedImage.findMany({
    where: {
      OR: [{ imageFile: null }, { imageFile: "" }],
      status: "waiting",
    },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
  if (items.length === 0) {
    console.log("✅ ไม่มี prompt ที่รอการ generate แล้ว");
    return;
  }

  console.log(`🚀 เริ่ม generate รูปจำนวน ${items.length} รายการ...`);

  await prisma.generatedImage.updateMany({
    where: { id: { in: items.map(i => i.id) } },
    data: { status: "processing" },
  });

  await Promise.all(items.map(async item => {
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
        await new Promise(r => setTimeout(r, 1500));
        const poll = await axios.get(`https://api.replicate.com/v1/predictions/${result.id}`, {
          headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` },
        });
        result = poll.data;
      }

      if (result.status !== "succeeded") return handleFailedGeneration(item.id);

      const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;
      const imageData = await axios.get(outputUrl, { responseType: "arraybuffer" });

      const slug = slugify(item.imageTitle);
      const timestamp = Date.now();
      const fileName = `${slug}-${timestamp}.jpg`;
      const fullPath = `medias/ai/stock-asset/${fileName}`;

      const r2Url = await uploadToR2(fullPath, Buffer.from(imageData.data)); // ⬅️ อัปโหลดขึ้น Cloudflare R2

      await prisma.generatedImage.update({
        where: { id: item.id },
        data: {
          model: model.id,
          ratio,
          tags,
          imageFile: r2Url,
          response: result,
          status: "completed",
          createImageDt: { generated_at: new Date().toISOString() },
          resizeImageCover: r2Url.replace(".jpg", "-cover.jpg"),
          resizeImageThumb: r2Url.replace(".jpg", "-thumb.jpg"),
        },
      });

      resetFailCount();
    } catch (err) {
      console.error("❌ Generation error:", err);
      await handleFailedGeneration(item.id);
    }
  }));

  console.log("✅ เสร็จสิ้นการ generate ทั้ง batch\n");
}
