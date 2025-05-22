import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CF_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CF_R2_ACCESS_KEY!,
    secretAccessKey: process.env.CF_R2_SECRET_KEY!,
  },
});

export async function uploadToR2(filePath: string, buffer: Buffer): Promise<string> {
  const bucket = process.env.CF_R2_BUCKET!;
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: filePath,
      Body: buffer,
      ContentType: "image/jpeg",
    })
  );

  return `https://ai.bluweo.com/${filePath}`;
}
