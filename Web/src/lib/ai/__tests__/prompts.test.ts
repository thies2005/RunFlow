import { buildSystemPrompt, buildActivityChatPrompt, DEFAULT_SYSTEM_PROMPT } from '../prompts';

describe('AI Prompts', () => {
    describe('buildSystemPrompt', () => {
        it('should return the default system prompt when no base prompt is provided', () => {
            const result = buildSystemPrompt('');
            expect(result).toBe(DEFAULT_SYSTEM_PROMPT);
        });

        it('should use the provided base prompt', () => {
            const basePrompt = 'Custom base prompt';
            const result = buildSystemPrompt(basePrompt);
            expect(result).toBe(basePrompt);
        });

        it('should append user addition when provided', () => {
            const basePrompt = 'Base prompt';
            const userAddition = 'User addition';
            const result = buildSystemPrompt(basePrompt, userAddition);
            expect(result).toBe(`Base prompt\n\nAdditional context from the athlete:\nUser addition`);
        });

        it('should handle null user addition', () => {
            const basePrompt = 'Base prompt';
            const result = buildSystemPrompt(basePrompt, null);
            expect(result).toBe(basePrompt);
        });

        it('should handle undefined user addition', () => {
            const basePrompt = 'Base prompt';
            const result = buildSystemPrompt(basePrompt, undefined);
            expect(result).toBe(basePrompt);
        });

        it('should use default prompt and append user addition when base prompt is empty', () => {
            const userAddition = 'User addition';
            const result = buildSystemPrompt('', userAddition);
            expect(result).toBe(`${DEFAULT_SYSTEM_PROMPT}\n\nAdditional context from the athlete:\nUser addition`);
        });
    });

    describe('buildActivityChatPrompt', () => {
        it('should correctly embed activity context', () => {
            const activityContext = 'Activity details...';
            const result = buildActivityChatPrompt(activityContext);
            const expected = `The athlete wants to discuss a specific activity. Here are the details:

Activity details...

Answer their questions about this activity specifically. Consider the workout context, their effort, and how it fits into their training.`;
            expect(result).toBe(expected);
        });
    });
});
