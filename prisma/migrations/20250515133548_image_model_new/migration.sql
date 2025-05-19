/*
  Warnings:

  - You are about to drop the `Image` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Image";

-- CreateTable
CREATE TABLE "GeneratedImage" (
    "id" SERIAL NOT NULL,
    "image_title" TEXT NOT NULL,
    "prompts" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "create_prompt_dt" JSONB NOT NULL,
    "image_file" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "ratio" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "create_image_dt" JSONB NOT NULL,
    "resize_image_cover" TEXT NOT NULL,
    "resize_image_thumb" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedImage_pkey" PRIMARY KEY ("id")
);
