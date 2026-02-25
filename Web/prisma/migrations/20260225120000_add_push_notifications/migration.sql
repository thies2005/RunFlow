-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "supplementMorningEnabled" BOOLEAN NOT NULL DEFAULT false,
    "supplementMorningTime" TEXT NOT NULL DEFAULT '08:00',
    "supplementNoonEnabled" BOOLEAN NOT NULL DEFAULT false,
    "supplementNoonTime" TEXT NOT NULL DEFAULT '12:00',
    "supplementEveningEnabled" BOOLEAN NOT NULL DEFAULT false,
    "supplementEveningTime" TEXT NOT NULL DEFAULT '20:00',
    "weightReminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "weightReminderTime" TEXT NOT NULL DEFAULT '07:00',
    "foodBreakfastEnabled" BOOLEAN NOT NULL DEFAULT false,
    "foodBreakfastTime" TEXT NOT NULL DEFAULT '09:00',
    "foodLunchEnabled" BOOLEAN NOT NULL DEFAULT false,
    "foodLunchTime" TEXT NOT NULL DEFAULT '13:00',
    "foodDinnerEnabled" BOOLEAN NOT NULL DEFAULT false,
    "foodDinnerTime" TEXT NOT NULL DEFAULT '19:00',
    "workoutReminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "workoutReminderMinutes" INTEGER NOT NULL DEFAULT 60,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "lastSupplementMorningSent" TIMESTAMP(3),
    "lastSupplementNoonSent" TIMESTAMP(3),
    "lastSupplementEveningSent" TIMESTAMP(3),
    "lastWeightSent" TIMESTAMP(3),
    "lastFoodBreakfastSent" TIMESTAMP(3),
    "lastFoodLunchSent" TIMESTAMP(3),
    "lastFoodDinnerSent" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderSettings_userId_key" ON "ReminderSettings"("userId");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderSettings" ADD CONSTRAINT "ReminderSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
