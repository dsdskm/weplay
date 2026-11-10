ALTER TABLE "Terms" ADD COLUMN "attachment" JSONB,
ADD COLUMN "changeSummary" TEXT NOT NULL DEFAULT '';

CREATE TABLE "TermsNotification" (
  "id" TEXT NOT NULL,
  "termsId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "sentAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TermsNotification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TermsNotification_termsId_fkey" FOREIGN KEY ("termsId") REFERENCES "Terms"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TermsNotification_termsId_userId_key" ON "TermsNotification"("termsId", "userId");
CREATE INDEX "TermsNotification_status_attempts_idx" ON "TermsNotification"("status", "attempts");