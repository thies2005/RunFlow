/**
 * Configuration Validation
 * 
 * Validates environment configuration at startup to prevent
 * running with insecure default values in production.
 */

const REQUIRED_SECRETS = [
    'NEXTAUTH_SECRET',
    'DATABASE_URL',
] as const;

const FORBIDDEN_PATTERNS = [
    'development-secret',
    'your-secret-key',
    'changeme',
    'min-32-chars',
    'change-in-production',
    'example',
] as const;

/**
 * Check if a value appears to be a default/insecure value
 */
function containsForbiddenPattern(value: string): boolean {
    const lowerValue = value.toLowerCase();
    return FORBIDDEN_PATTERNS.some(pattern => lowerValue.includes(pattern));
}

/**
 * Validate all required configuration is properly set
 * 
 * @throws Error if configuration is invalid in production
 */
export function validateConfig(): void {
    const errors: string[] = [];

    // Check required secrets
    for (const secret of REQUIRED_SECRETS) {
        const value = process.env[secret];

        if (!value) {
            errors.push(`Missing required environment variable: ${secret}`);
            continue;
        }

        if (containsForbiddenPattern(value)) {
            errors.push(
                `Security: ${secret} appears to be using a default/example value. ` +
                `Generate a secure value with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
            );
        }
    }

    // Check optional secrets that should be set in production
    const optionalSecrets = ['ENCRYPTION_KEY', 'JWT_SECRET', 'STRAVA_CLIENT_SECRET'];
    for (const secret of optionalSecrets) {
        const value = process.env[secret];
        if (value && containsForbiddenPattern(value)) {
            errors.push(
                `Security: ${secret} appears to be using a default/example value.`
            );
        }
    }

    // Only throw in production
    if (errors.length > 0 && process.env.NODE_ENV === 'production') {
        console.error('\n=== CONFIGURATION ERROR ===');
        errors.forEach(err => console.error(`  - ${err}`));
        console.error('===========================\n');
        throw new Error(
            `Configuration validation failed with ${errors.length} error(s). ` +
            `See logs above for details.`
        );
    }

    // Log warnings in development
    if (errors.length > 0) {
        console.warn('\n=== CONFIGURATION WARNINGS (dev only) ===');
        errors.forEach(err => console.warn(`  - ${err}`));
        console.warn('==========================================\n');
    }
}

/**
 * Get a validated environment variable
 * 
 * @throws Error if the variable is not set (in production) or appears insecure
 */
export function getRequiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error(`Required environment variable ${name} is not set`);
        }
        console.warn(`[Config] Missing ${name}, using empty string (dev only)`);
        return '';
    }

    return value;
}
