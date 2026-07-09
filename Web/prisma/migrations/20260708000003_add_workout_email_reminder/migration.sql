ALTER TABLE "ReminderSettings" ADD COLUMN "workoutEmailEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ReminderSettings" ADD COLUMN "lastWorkoutEmailSent" TIMESTAMP(3);
