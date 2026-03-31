import { prisma } from '@/lib/db';
import crypto from 'crypto';

interface ErrorData {
  routePath: string;
  method: string;
  errorMessage: string;
  stackTrace?: string;
  userId?: string;
  userAgent?: string;
  timestamp?: number;
}

function generateFingerprint(errorMessage: string, stackTrace?: string): string {
  const data = stackTrace ? `${errorMessage}:${stackTrace.split('\n')[0]}` : errorMessage;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
    .replace(/Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g, 'Bearer [REDACTED_TOKEN]')
    .replace(/sk-[A-Za-z0-9]{32,}/g, '[REDACTED_API_KEY]')
    .substring(0, 5000);
}

function sanitizeStackTrace(stackTrace?: string): string | undefined {
  if (!stackTrace) return undefined;
  
  return stackTrace
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
    .replace(/Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g, 'Bearer [REDACTED_TOKEN]')
    .replace(/sk-[A-Za-z0-9]{32,}/g, '[REDACTED_API_KEY]')
    .substring(0, 10000);
}

const errorBuffer: ErrorData[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

export async function trackError(data: ErrorData) {
  const sanitizedMessage = sanitizeErrorMessage(data.errorMessage);
  const sanitizedStackTrace = sanitizeStackTrace(data.stackTrace);
  const fingerprint = generateFingerprint(sanitizedMessage, sanitizedStackTrace);

  errorBuffer.push({
    ...data,
    errorMessage: sanitizedMessage,
    stackTrace: sanitizedStackTrace,
    timestamp: Date.now(),
  });

  if (errorBuffer.length >= 50) {
    flushErrors();
  } else if (!flushTimeout) {
    flushTimeout = setTimeout(() => {
      flushErrors();
    }, 10000);
  }

  return { fingerprint };
}

async function flushErrors() {
  if (errorBuffer.length === 0) {
    return;
  }

  const errorsToFlush = [...errorBuffer];
  errorBuffer.length = 0;

  const errorGroups = new Map<string, ErrorData[]>();
  
  for (const error of errorsToFlush) {
    const fingerprint = generateFingerprint(error.errorMessage, error.stackTrace);
    if (!errorGroups.has(fingerprint)) {
      errorGroups.set(fingerprint, []);
    }
    errorGroups.get(fingerprint)!.push(error);
  }

  for (const [fingerprint, errors] of Object.entries(errorGroups)) {
    try {
      const existingError = await prisma.errorLog.findFirst({
        where: {
          fingerprint,
          resolved: false,
        },
        orderBy: {
          timestamp: 'desc',
        },
      });

      if (existingError) {
        await prisma.errorLog.update({
          where: { id: existingError.id },
          data: {
            count: existingError.count + errors.length,
            timestamp: new Date(),
          },
        });
      } else {
        const latestError = errors[errors.length - 1];
        await prisma.errorLog.create({
          data: {
            routePath: latestError.routePath,
            method: latestError.method,
            errorMessage: latestError.errorMessage,
            stackTrace: latestError.stackTrace,
            userId: latestError.userId,
            userAgent: latestError.userAgent,
            fingerprint,
            count: errors.length,
          },
        });
      }
    } catch (error) {
      console.error('Failed to flush error logs:', error);
    }
  }

  flushTimeout = null;
}

export function isErrorRateTooHigh(): boolean {
  const now = Date.now();
  const recentErrors = errorBuffer.filter(
    e => e.timestamp ? now - e.timestamp < 60000 : false
  );
  return recentErrors.length > 100;
}

export function createGlobalErrorHandler() {
  return function globalErrorHandler(error: Error, context?: {
    routePath?: string;
    method?: string;
    userId?: string;
    userAgent?: string;
  }) {
    if (isErrorRateTooHigh()) {
      console.error('Error rate too high, skipping tracking');
      return;
    }

    trackError({
      routePath: context?.routePath || 'unknown',
      method: context?.method || 'UNKNOWN',
      errorMessage: error.message,
      stackTrace: error.stack,
      userId: context?.userId,
      userAgent: context?.userAgent,
    });
  };
}
