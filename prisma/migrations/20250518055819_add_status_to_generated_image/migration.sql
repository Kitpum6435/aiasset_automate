-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('waiting', 'processing', 'completed', 'failed');

-- AlterTable
ALTER TABLE "GeneratedImage" ADD COLUMN     "status" "GenerationStatus" NOT NULL DEFAULT 'waiting';
