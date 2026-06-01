-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
