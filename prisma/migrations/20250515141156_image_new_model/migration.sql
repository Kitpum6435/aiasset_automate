-- AlterTable
ALTER TABLE "GeneratedImage" ALTER COLUMN "image_file" DROP NOT NULL,
ALTER COLUMN "response" DROP NOT NULL,
ALTER COLUMN "create_image_dt" DROP NOT NULL,
ALTER COLUMN "resize_image_cover" DROP NOT NULL,
ALTER COLUMN "resize_image_thumb" DROP NOT NULL;
