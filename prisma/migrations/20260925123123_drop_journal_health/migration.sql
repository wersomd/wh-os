/*
  Warnings:

  - You are about to drop the `HealthLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HealthMetric` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `JournalEntry` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "HealthLog" DROP CONSTRAINT "HealthLog_metricId_fkey";

-- DropTable
DROP TABLE "HealthLog";

-- DropTable
DROP TABLE "HealthMetric";

-- DropTable
DROP TABLE "JournalEntry";
