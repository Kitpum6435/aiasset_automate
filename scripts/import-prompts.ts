// 📁 scripts/import-prompts.ts
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { generateTagsFromPrompt, getRandomRatio, getRandomModel } from "../src/lib/randomUtils";

const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(__dirname, "modify-.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const prompts = JSON.parse(raw);

  let success = 0;
  let skipped = 0;

  for (const item of prompts) {
    const exists = await prisma.aiasset_automate.findFirst({
      where: { prompts: item.prompts }
    });
    if (exists) {
      console.log(`⏭ ข้าม prompt ซ้ำ: ${item.prompts}`);
      skipped++;
      continue;
    }

    const model = getRandomModel();
    const ratio = getRandomRatio();
    const tags = Array.isArray(item.tags) ? item.tags : generateTagsFromPrompt(item.prompts);

    await prisma.aiasset_automate.create({
      data: {
        image_title: item.image_title,
        prompts: item.prompts,
        tags,
        model: model.id,
        ratio,
        size: "1600x900",
        create_prompt_dt: { imported_at: new Date().toISOString() },
        image_file: "",
        response: {},
        create_image_dt: {},
        resize_image_cover: "",
        resize_image_thumb: "",
        status: "waiting",
      },
    });
    success++;
  }

  console.log(`✅ เพิ่มใหม่ ${success} รายการ, ข้าม ${skipped} รายการซ้ำ`);
}

main()
  .catch((e) => {
    console.error("❌ Failed to import prompts", e);
  })
  .finally(() => prisma.$disconnect());
