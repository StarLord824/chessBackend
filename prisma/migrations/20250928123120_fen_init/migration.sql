/*
  Warnings:

  - Added the required column `fen` to the `Match` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Match" ADD COLUMN     "endReason" TEXT,
ADD COLUMN     "fen" TEXT NOT NULL;
