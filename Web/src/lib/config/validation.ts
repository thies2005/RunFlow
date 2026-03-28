import { z } from 'zod'

const FORBIDDEN_PATTERNS = [
  'your-',
  'example-',
  'change-me-',
  '<test>',
  'changeme',
  'change-in-production',
  'min-32-chars',
  'development-secret',
] as const

function containsForbiddenPattern(value: string): boolean {
  const lowerValue = value.toLowerCase()
  return FORBIDDEN_PATTERNS.some(pattern => lowerValue.includes(pattern))
}

const REQUIRED_ENV_VARS = [
  'NEXTAUTH_SECRET',
  'DATABASE_URL',
] as const

const OPTIONAL_ENV_VARS = [
  'ENCRYPTION_KEY',
  'JWT_SECRET',
  'STRAVA_CLIENT_SECRET',
] as const

const envVarSchema = z.object({
  NEXTAUTH_SECRET: z.string().min(32),
  DATABASE_URL: z.string().url(),
  ENCRYPTION_KEY: z.string().min(32).optional(),
  JWT_SECRET: z.string().min(32).optional(),
  STRAVA_CLIENT_SECRET: z.string().min(1).optional(),
})

export type EnvVarSchema = z.infer<typeof envVarSchema>

export function validateEnvironmentVariables(): void {
  const errors: string[] = []

  if (process.env.ADMIN_USERNAME === 'admin' && process.env.ADMIN_PASSWORD === 'admin') {
    errors.push(`Security: ADMIN_USERNAME and ADMIN_PASSWORD are using default 'admin/admin' credentials`)
  }

  if (process.env.POSTGRES_PASSWORD === 'runflow') {
    errors.push(`Security: POSTGRES_PASSWORD is using the default 'runflow' credential`)
  }

  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar]

    if (!value) {
      errors.push(`Missing required environment variable: ${envVar}`)
      continue
    }

    if (containsForbiddenPattern(value)) {
      errors.push(
        `Security: ${envVar} appears to be using a default/example value. ` +
        `Generate a secure value with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
      )
    }
  }

  for (const envVar of OPTIONAL_ENV_VARS) {
    const value = process.env[envVar]
    if (value && containsForbiddenPattern(value)) {
      errors.push(`Security: ${envVar} appears to be using a default/example value.`)
    }
  }

  const envConfig: Partial<EnvVarSchema> = {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    JWT_SECRET: process.env.JWT_SECRET,
    STRAVA_CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET,
  }

  const validationResult = envVarSchema.safeParse(envConfig)
  if (!validationResult.success) {
    (validationResult.error as { issues: Array<{ path: (string | number)[]; message: string }> }).issues.forEach((err) => {
      errors.push(`Validation error for ${err.path.join('.')}: ${err.message}`)
    })
  }

  if (errors.length > 0 && process.env.NODE_ENV === 'production') {
    console.error('\n=== CONFIGURATION ERROR ===')
    errors.forEach(err => console.error(`  - ${err}`))
    console.error('===========================\n')
    throw new Error(
      `Environment variable validation failed with ${errors.length} error(s).`
    )
  }

  if (errors.length > 0) {
    console.warn('\n=== CONFIGURATION WARNINGS (dev only) ===')
    errors.forEach(err => console.warn(`  - ${err}`))
    console.warn('==========================================\n')
  }
}

export function getValidatedEnv(): EnvVarSchema {
  validateEnvironmentVariables()

  return {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
    DATABASE_URL: process.env.DATABASE_URL!,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    JWT_SECRET: process.env.JWT_SECRET,
    STRAVA_CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET,
  }
}
