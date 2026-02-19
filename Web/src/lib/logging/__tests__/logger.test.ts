import { logger, generateRequestId, auditLog } from '../logger';

describe('Logger', () => {
  const originalEnv = process.env;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleSpy.mockRestore();
  });

  describe('Production Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should log error as JSON string', () => {
      const message = 'Test error message';
      const context = { userId: '123' };

      logger.error(message, context);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry).toMatchObject({
        level: 'error',
        message,
        environment: 'production',
        ...context
      });
      expect(logEntry.timestamp).toBeDefined();
    });

    it('should log warn as JSON string', () => {
      const message = 'Test warn message';
      logger.warn(message);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry).toMatchObject({
        level: 'warn',
        message,
        environment: 'production'
      });
    });

    it('should log info as JSON string', () => {
      const message = 'Test info message';
      logger.info(message);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry).toMatchObject({
        level: 'info',
        message,
        environment: 'production'
      });
    });

    it('should log debug as JSON string', () => {
        const message = 'Test debug message';
        logger.debug(message);

        expect(consoleSpy).toHaveBeenCalledTimes(1);
        const logCall = consoleSpy.mock.calls[0][0];
        const logEntry = JSON.parse(logCall);

        expect(logEntry).toMatchObject({
          level: 'debug',
          message,
          environment: 'production'
        });
      });
  });

  describe('Development Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should log error with color', () => {
      const message = 'Test error message';
      const context = { userId: '123' };

      logger.error(message, context);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const [logMessage, logContext] = consoleSpy.mock.calls[0];

      expect(logMessage).toContain('[ERROR]');
      // Red color code
      expect(logMessage).toContain('\x1b[31m');
      expect(logContext).toEqual(context);
    });

    it('should log warn with color', () => {
        const message = 'Test warn message';
        logger.warn(message);

        expect(consoleSpy).toHaveBeenCalledTimes(1);
        const [logMessage] = consoleSpy.mock.calls[0];

        expect(logMessage).toContain('[WARN]');
        // Yellow color code
        expect(logMessage).toContain('\x1b[33m');
    });

    it('should log info with color', () => {
        const message = 'Test info message';
        logger.info(message);

        expect(consoleSpy).toHaveBeenCalledTimes(1);
        const [logMessage] = consoleSpy.mock.calls[0];

        expect(logMessage).toContain('[INFO]');
        // Cyan color code
        expect(logMessage).toContain('\x1b[36m');
    });

    it('should log debug with color', () => {
        const message = 'Test debug message';
        logger.debug(message);

        expect(consoleSpy).toHaveBeenCalledTimes(1);
        const [logMessage] = consoleSpy.mock.calls[0];

        expect(logMessage).toContain('[DEBUG]');
        // Grey color code
        expect(logMessage).toContain('\x1b[90m');
    });
  });

  describe('auditLog', () => {
      it('should log audit info', () => {
          const action = 'User Login';
          const context = { userId: '123' };

          // Spy on logger.info specifically
          const loggerInfoSpy = jest.spyOn(logger, 'info');

          auditLog(action, context);

          expect(loggerInfoSpy).toHaveBeenCalledWith(`[AUDIT] ${action}`, context);

          loggerInfoSpy.mockRestore();
      });
  });

  describe('generateRequestId', () => {
      it('should generate a request id', () => {
          const requestId = generateRequestId();
          expect(typeof requestId).toBe('string');
          // Format is `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          // e.g. 1709...-abc123...
          const parts = requestId.split('-');
          expect(parts.length).toBe(2);
          expect(Number(parts[0])).not.toBeNaN();
          expect(parts[1].length).toBeGreaterThan(0);
      });
  });
});
