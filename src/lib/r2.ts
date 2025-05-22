import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
  },
});

export async function uploadToR2(fileName: string, buffer: Buffer, contentType = "image/jpeg") {
  const command = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET!,
    Key: fileName,
    Body: buffer,
    ContentType: contentType,
  });

  await r2.send(command);

  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`;
}
