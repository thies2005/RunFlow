interface LogContext {
  userId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  status?: number;
  error?: string;
  duration?: number;
  [key: string]: any;
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

function log(level: LogLevel, message: string, context: LogContext = {}) {
  const logEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    ...context,
  };

  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(logEntry));
  } else {
    const color = {
      error: '\x1b[31m',
      warn: '\x1b[33m',
      info: '\x1b[36m',
      debug: '\x1b[90m',
    }[level];

    const reset = '\x1b[0m';
    console.log(`${color}[${level.toUpperCase()}]${reset} ${message}`, context);
  }
}

export const logger = {
  error: (message: string, context?: LogContext) => log('error', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  debug: (message: string, context?: LogContext) => log('debug', message, context),
};

export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function auditLog(action: string, context: LogContext = {}) {
  logger.info(`[AUDIT] ${action}`, context);
}
