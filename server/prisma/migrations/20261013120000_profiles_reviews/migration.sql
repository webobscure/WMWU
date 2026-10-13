ALTER TABLE "User" ADD COLUMN "bio" TEXT;

CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "userMovieId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "hasSpoilers" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Review_userMovieId_key" ON "Review"("userMovieId");
CREATE INDEX "Review_createdAt_idx" ON "Review"("createdAt");
ALTER TABLE "Review" ADD CONSTRAINT "Review_userMovieId_fkey"
    FOREIGN KEY ("userMovieId") REFERENCES "UserMovie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
