import { PrismaClient } from "@prisma/client";
import axios from "axios";
import fs from "fs";
import path from "path";


const prisma = new PrismaClient();

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function generateImages() {
  const prompts = await prisma.generatedImage.findMany({
    where: { imageFile: "", status: "waiting" },
    take: 3
  });

  for (const item of prompts) {
    try {
      console.log(`🚀 Generating image for: ${item.imageTitle}`);

      const versionId = "352185dbc99e9dd708b78b4e6870e3ca49d00dc6451a32fc6dd57968194fae5a";
      const prediction = await axios.post(
        `https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro-ultra/versions/${versionId}/predictions`,
        {
          input: {
            prompt: item.prompts,
            aspect_ratio: "1:1",
            raw: false
          }
        },
        {
          headers: {
            Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json"
          }
        }
      );

      let result = prediction.data;
      while (result.status !== "succeeded" && result.status !== "failed") {
        await new Promise((r) => setTimeout(r, 1500));
        const poll = await axios.get(
          `https://api.replicate.com/v1/predictions/${result.id}`,
          {
            headers: {
              Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`
            }
          }
        );
        result = poll.data;
      }

      if (result.status === "succeeded") {
        const outputUrl = Array.isArray(result.output)
          ? result.output[0]
          : result.output;

        // ตรวจสอบว่า URL มีคำที่น่าสงสัยไหม
        const suspicious = /weird|fail|error/.test(outputUrl);
        if (suspicious) {
          console.warn(`❌ Suspicious image detected for ${item.imageTitle}`);
          await prisma.generatedImage.update({
            where: { id: item.id },
            data: { status: "failed" }
          });
          continue;
        }

        const imageBuffer = await axios.get(outputUrl, {
          responseType: "arraybuffer"
        });

        const slug = slugify(item.imageTitle);
        const timestamp = Math.floor(Date.now() / 1000);
        const fileName = `${slug}-${timestamp}.jpg`;
        const saveDir = path.join(process.cwd(), "public", "medias" ,"ai", "stock-asset");

        if (!fs.existsSync(saveDir)) {
          fs.mkdirSync(saveDir, { recursive: true });
        }

        const fullPath = path.join(saveDir, fileName);
        await fs.promises.writeFile(fullPath, imageBuffer.data);

        const storedPath = `medias/ai/stock-asset/${fileName}`;
        const coverPath = `/storage/app/ai/stock-asset/${slug}-${timestamp}-cover.jpg`;
        const thumbPath = `/storage/app/ai/stock-asset/${slug}-${timestamp}-thumb.jpg`;

        await prisma.generatedImage.update({
          where: { id: item.id },
          data: {
            imageFile: storedPath,
            createImageDt: { generated_at: new Date().toISOString() },
            response: result,
            resizeImageCover: coverPath,
            resizeImageThumb: thumbPath,
            status: "completed"
          }
        });

        console.log(`✅ Saved to: ${storedPath}`);
      } else {
        console.warn(`⚠️ Failed to generate for ${item.imageTitle}`);
        await prisma.generatedImage.update({
          where: { id: item.id },
          data: { status: "failed" }
        });
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err && err.response && typeof err.response === "object" && "data" in err.response) {
        console.error(`❌ Error generating image:`, err.response.data);
      } else if (err instanceof Error) {
        console.error(`❌ Error generating image:`, err.message);
      } else {
        console.error(`❌ Error generating image:`, err);
      }
    }
  }
}

setInterval(() => {
  generateImages().catch(console.error);
}, 5000);

process.on("SIGINT", () => {
  prisma.$disconnect().then(() => process.exit(0));
});
