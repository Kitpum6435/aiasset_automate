import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config(); // โหลดค่า .env

const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
const bucket = process.env.CLOUDFLARE_R2_BUCKET;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_KEY;
const cdnUrl = process.env.CLOUDFLARE_R2_URL || "https://ai.bluweo.com";

if (!bucket || !accessKeyId || !secretAccessKey || !endpoint) {
  throw new Error("❌ Missing R2 config in .env (bucket, keys, or endpoint)");
}

const s3 = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export async function uploadToR2(filePath: string, buffer: Buffer): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: filePath,
      Body: buffer,
      ContentType: "image/jpeg",
    })
  );

  return `${cdnUrl}/${filePath}`;
}
