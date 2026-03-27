-- CreateTable
CREATE INDEX "ChatMessage_activityId_idx" ON "ChatMessage"("activityId");

-- CreateTable
CREATE INDEX "NutritionLog_userId_date_idx" ON "NutritionLog"("userId", "date");
