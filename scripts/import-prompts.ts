import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
  const raw = fs.readFileSync("modify-.json", "utf-8");
  const prompts = JSON.parse(raw);

  for (const item of prompts) {
    await prisma.generatedImage.create({
      data: {
        imageTitle: item.image_title,
        prompts: item.prompts,
        tags: item.tags,
        model: "black-forest-labs/flux-1.1-pro-ultra",
        ratio: "16:9",
        size: "1600x900",
        createPromptDt: { imported_at: new Date().toISOString() },
        imageFile: "",
        response: {},
        createImageDt: {},
        resizeImageCover: "",
        resizeImageThumb: "",
      },
    });
  }

  console.log(`✅ Imported ${prompts.length} prompts`);
}

main()
  .catch((e) => {
    console.error("❌ Failed to import prompts", e);
  })
  .finally(() => prisma.$disconnect());
