-- Create a test AI provider
INSERT INTO "AiProvider" (id, name, slug, type, "baseUrl", "apiKey", models, "isActive", "monthlyInputTokensUsed", "monthlyOutputTokensUsed", "lastUsageReset", "createdAt", "updatedAt")
VALUES (
    'test-provider-001',
    'Test OpenAI',
    'test-openai',
    'openai',
    'https://api.openai.com/v1',
    'encrypted-test-key',
    ARRAY['gpt-4', 'gpt-3.5-turbo'],
    true,
    150000,
    75000,
    NOW(),
    NOW(),
    NOW()
);

-- Insert daily token usage for the last 30 days
DO $$
DECLARE
    day_offset INT;
    random_input INT;
    random_output INT;
BEGIN
    FOR day_offset IN 0..29 LOOP
        random_input := 5000 + floor(random() * 20000)::INT;
        random_output := 2500 + floor(random() * 10000)::INT;
        
        INSERT INTO "AiDailyTokenUsage" (id, date, "inputTokens", "outputTokens", "providerId")
        VALUES (
            'daily-' || day_offset,
            (CURRENT_DATE - day_offset * INTERVAL '1 day'),
            random_input,
            random_output,
            'test-provider-001'
        );
    END LOOP;
END $$;

SELECT COUNT(*) as "Records Created" FROM "AiDailyTokenUsage";
