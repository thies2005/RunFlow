const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Decrypt token helper (matching app's logic)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; 

function decryptToken(encryptedText) {
    if (!encryptedText) return null;
    try {
        const textParts = encryptedText.split(':');
        if (textParts.length !== 2) return null;
        
        const iv = Buffer.from(textParts[0], 'hex');
        const encryptedTextBuffer = Buffer.from(textParts[1], 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
        
        let decrypted = decipher.update(encryptedTextBuffer);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        return decrypted.toString();
    } catch (error) {
        return null; // Return null on decryption failure
    }
}

async function main() {
    console.log('Testing Non-Google API generation...');
    
    const globalSettings = await prisma.globalAiSettings.findUnique({
        where: { id: 'singleton' },
        include: { activeProvider: true }
    });
    
    if (!globalSettings?.activeProvider) {
        console.log('No active provider found');
        return;
    }
    
    const { type, baseUrl, apiKey, models } = globalSettings.activeProvider;
    console.log('Active Provider:', type, baseUrl);
    
    const decryptedKey = decryptToken(apiKey);
    const key = decryptedKey?.split(',')[0].trim() || '';
    
    const model = globalSettings.activityFeedbackModel || models[0];
    console.log('Model:', model);
    
    const messages = [
        { role: 'system', content: 'You are a test assistant.' },
        { role: 'user', content: 'Say hello world in 2 words.' }
    ];
    
    let res;
    if (type === 'openai') {
        res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
                model,
                messages,
                max_tokens: 1000,
                temperature: 0.7
            })
        });
    } else if (type === 'anthropic') {
        res = await fetch(`${baseUrl}/v1/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': key,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model,
                system: messages[0].content,
                messages: [{ role: 'user', content: messages[1].content }],
                max_tokens: 1000,
                temperature: 0.7
            })
        });
    }
    
    console.log('Response Status:', res.status);
    const data = await res.json();
    console.log('Raw Data:', JSON.stringify(data, null, 2));
    
    if (type === 'openai') {
        console.log('Extracted output:', data.choices?.[0]?.message?.content);
    } else if (type === 'anthropic') {
        console.log('Extracted output:', data.content?.[0]?.text);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
