1. **Remove `console.log` statements in `Web/src/app/api/v1/ai/chat/route.ts`**
   - Identify all `console.log` statements inside the stream start handling:
     - `console.log(\`AI Chat: Starting stream for user \${userId}, session \${sessionId}\`);`
     - `console.log(\`[STREAM START] Session: \${sessionId}, User: \${userId}, Model: \${config.model}\`);`
     - `console.log(\`[STREAM PROGRESS] Session: \${sessionId}, Tokens: \${tokenCount}, Response length: \${fullResponse.length}\`);`
     - `console.log(\`[STREAM END] Session: \${sessionId}, Total tokens: \${tokenCount}, Final response length: \${fullResponse.length}\`);`
     - `console.log(\`[DB SAVE] Session: \${sessionId}, Saved \${fullResponse.length} chars to database\`);`
   - Either remove them or replace them with `logger.debug` / `logger.info` if logging is required. Given the context in memory:
     - "Production code must use `@/lib/logging/logger` (e.g., `logger.error`) instead of native `console` methods to ensure errors are captured in monitoring systems."
     - Let's replace the `console.log` with `@/lib/logging/logger.ts` methods `logger.info` and `logger.debug` and `console.error` with `logger.error` using context objects.
     - Also we should import the logger.

2. **Replace `console.error` with `logger.error`**
   - Replace `console.error('Intent detection failed', e);` -> `logger.error('Intent detection failed', { error: e });`
   - Replace `console.error('[DB ERROR] Failed to save AI response or update usage', dbError);` -> `logger.error('[DB ERROR] Failed to save AI response or update usage', { error: dbError });`
   - Replace `console.error(\`[STREAM ERROR] Session: \${sessionId}, Error:\`, error);` -> `logger.error('[STREAM ERROR]', { sessionId, error });`
   - Replace `console.error('AI Chat error:', error);` -> `logger.error('AI Chat error', { error });`

3. **Verify and run format/lint**
   - Run linter/type checker in `Web` folder to ensure the code is valid.
   - Run pre-commit checks to ensure proper verification.

4. **Submit change**
   - Commit and submit with the required title and description.
