import { z } from 'zod'
import { RaceType } from '@prisma/client'
import { PASSWORD_POLICY } from '@/lib/constants'

export const activitySchema = z.object({
  name: z.string().min(1).max(200),
  date: z.string().datetime(),
  type: z.enum(['RUN', 'VIRTUAL_RIDE', 'RIDE', 'WALK', 'HIKE', 'SWIM', 'WORKOUT', 'OTHER']).optional(),
  distance: z.number().positive().max(500),
  duration: z.number().int().positive().max(2880),
  hr: z.number().min(30).max(250).optional().nullable(),
  hrZones: z.object({
    z1: z.number().int().nonnegative().optional(),
    z2: z.number().int().nonnegative().optional(),
    z3: z.number().int().nonnegative().optional(),
    z4: z.number().int().nonnegative().optional(),
    z5: z.number().int().nonnegative().optional(),
    z6: z.number().int().nonnegative().optional(),
    z7: z.number().int().nonnegative().optional(),
  }).optional()
})

export const goalSchema = z.object({
  name: z.string().min(1).max(255),
  raceType: z.nativeEnum(RaceType),
  raceDate: z.string().datetime(),
  targetTime: z.number().int().positive().optional(),
  weeklyMileageGoal: z.number().int().positive().optional(),
  planWeeks: z.number().int().positive().optional(),
  runsPerWeek: z.number().int().nonnegative().max(7).optional(),
  ridesPerWeek: z.number().int().nonnegative().max(7).optional(),
  strengthPerWeek: z.number().int().nonnegative().max(7).optional(),
  swimsPerWeek: z.number().int().nonnegative().max(7).optional(),
  taperWeeks: z.number().int().nonnegative().optional(),
  peakWeeks: z.number().int().nonnegative().optional(),
  buildWeeks: z.number().int().nonnegative().optional(),
  longRunDay: z.number().int().min(0).max(6).optional(),
  workoutDay: z.number().int().min(0).max(6).optional(),
  calibrationTime: z.number().int().positive().optional(),
  calibrationDistance: z.enum(['5K', '10K', 'HALF', 'MARATHON']).optional(),
  calibrationFactor: z.number().positive().optional(),
  planStartDate: z.string().datetime().optional()
})

export const userSettingsSchema = z.object({
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  thresholdHeartRate: z.number().int().positive().optional(),
  thresholdPace: z.number().int().positive().optional(),
  hrZone1Max: z.number().int().positive().optional(),
  hrZone2Max: z.number().int().positive().optional(),
  hrZone3Max: z.number().int().positive().optional(),
  hrZone4Max: z.number().int().positive().optional(),
  hrZone5Max: z.number().int().positive().optional(),
  hrZone6Max: z.number().int().positive().optional(),
  hrZone7Max: z.number().int().positive().optional(),
  includeCrossTraining: z.boolean().optional(),
  useImperial: z.boolean().optional()
})

export const passwordSchema = z
    .string()
    .min(PASSWORD_POLICY.MIN_LENGTH, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

export const registrationSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: passwordSchema,
    name: z.string().min(1, 'Name is required'),
})

export const passwordResetSchema = z.object({
    password: passwordSchema,
    confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
})

const FORBIDDEN_PASSWORDS = [
  'password',
  '123456',
  'qwerty',
  'admin',
  'test',
] as const

export const passwordStrengthSchema = passwordSchema.refine(
  (value) => {
    const lowerValue = value.toLowerCase()
    return !FORBIDDEN_PASSWORDS.some(forbidden => lowerValue.includes(forbidden))
  },
  {
    message: 'Password contains a common/forbidden pattern',
  }
)

export const envVarSchema = z.object({
  NEXTAUTH_SECRET: z.string().min(32),
  DATABASE_URL: z.string().url(),
  ENCRYPTION_KEY: z.string().min(32).optional(),
  JWT_SECRET: z.string().min(32).optional(),
  STRAVA_CLIENT_SECRET: z.string().min(1).optional(),
})
