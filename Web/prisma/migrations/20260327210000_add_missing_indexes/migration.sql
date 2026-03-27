-- CreateIndex
CREATE INDEX IF NOT EXISTS "ChatMessage_activityId_idx" ON "ChatMessage"("activityId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NutritionLog_userId_date_idx" ON "NutritionLog"("userId", "date");
