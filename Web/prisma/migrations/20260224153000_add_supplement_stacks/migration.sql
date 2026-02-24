CREATE TABLE "SupplementStack" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timeOfDay" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplementStack_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Supplement" ADD COLUMN "stackId" TEXT;

CREATE INDEX "SupplementStack_userId_timeOfDay_idx" ON "SupplementStack"("userId", "timeOfDay");
CREATE INDEX "Supplement_stackId_idx" ON "Supplement"("stackId");

ALTER TABLE "SupplementStack" ADD CONSTRAINT "SupplementStack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Supplement" ADD CONSTRAINT "Supplement_stackId_fkey" FOREIGN KEY ("stackId") REFERENCES "SupplementStack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
