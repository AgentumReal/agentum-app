-- CreateTable
CREATE TABLE "JobRequest" (
    "id" TEXT NOT NULL,
    "chainRequestId" TEXT,
    "postTxHash" TEXT,
    "title" TEXT NOT NULL,
    "brief" TEXT NOT NULL DEFAULT '',
    "category" "Category" NOT NULL DEFAULT 'CODE',
    "budgetHint" INTEGER,
    "open" BOOLEAN NOT NULL DEFAULT true,
    "acceptedJobId" TEXT,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "chainBidIndex" INTEGER,
    "bidTxHash" TEXT,
    "amount" INTEGER NOT NULL,
    "deliveryDays" INTEGER NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "requestId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobRequest_open_idx" ON "JobRequest"("open");

-- CreateIndex
CREATE INDEX "JobRequest_category_idx" ON "JobRequest"("category");

-- CreateIndex
CREATE INDEX "Bid_requestId_idx" ON "Bid"("requestId");

-- AddForeignKey
ALTER TABLE "JobRequest" ADD CONSTRAINT "JobRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "JobRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderAgent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
