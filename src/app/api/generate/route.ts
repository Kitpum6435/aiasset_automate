import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import axios from "axios";

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: Request) {
  try {
    const {
      image_title = "Untitled",
      prompt: rawPrompt,
      prompts,
      tags = [],
      ratio = "1:1",
      size = "1024x1024"
    } = await req.json();

    const prompt = rawPrompt || prompts;
    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const model = "black-forest-labs/flux-1.1-pro-ultra";
    const version = "352185dbc99e9dd708b78b4e6870e3ca49d00dc6451a32fc6dd57968194fae5a";

    const prediction = await axios.post(
      `https://api.replicate.com/v1/models/${model}/versions/${version}/predictions`,
      {
        input: {
          prompt,
          aspect_ratio: ratio,
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
      const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;
      const imageResponse = await axios.get(outputUrl, {
        responseType: "arraybuffer"
      });

      const timestamp = Math.floor(Date.now() / 1000);
      const slug = slugifyTitle(image_title);
      const fileName = `${slug}-${timestamp}.jpg`;

      const imageDir = path.join(process.cwd(), "public", "images");
      if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
      }

      const savePath = path.join(imageDir, fileName);
      await writeFile(savePath, imageResponse.data);

      const imageFile = `/images/${fileName}`;

      const basePath = `/medias/ai/stock-asset/${slug}-${timestamp}`;
      const resizeImageCover = `${basePath}-cover.jpg`;
      const resizeImageThumb = `${basePath}-thumb.jpg`;

      const saved = await prisma.generatedImage.create({
        data: {
          imageTitle: image_title,
          prompts: prompt,
          tags,
          createPromptDt: { created_at: new Date().toISOString() },
          imageFile,
          model,
          ratio,
          size,
          response: result,
          createImageDt: { created_at: new Date().toISOString() },
          resizeImageCover,
          resizeImageThumb
        }
      });

      return NextResponse.json(saved);
    }

    return NextResponse.json({ error: "Image generation failed" }, { status: 500 });
  } catch (err: unknown) {
    let errorMessage = "Unknown error";
    if (err && typeof err === "object") {
      if ("response" in err && typeof (err as import("axios").AxiosError).response?.data === "string") {
        errorMessage = (err as import("axios").AxiosError).response!.data as string;
      } else if ("message" in err && typeof (err as Error).message === "string") {
        errorMessage = (err as Error).message;
      } else {
        errorMessage = JSON.stringify(err);
      }
    }
    console.error("🔥 Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
