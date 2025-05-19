-- CreateTable
CREATE TABLE "AutomationSetting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "isRunning" BOOLEAN NOT NULL DEFAULT false,
    "ratio" TEXT NOT NULL DEFAULT '1:1',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationSetting_pkey" PRIMARY KEY ("id")
);
