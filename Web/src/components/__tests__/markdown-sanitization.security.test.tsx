/**
 * @jest-environment jsdom
 */

import fs from 'fs';
import path from 'path';
import DOMPurify from 'dompurify';
import { AUTH_BOUND_RUNTIME_CACHES } from '@/lib/pwa/authCacheEviction';

describe('Markdown Sanitization & SW Auth Cache Eviction Security Tests', () => {
    describe('Test 1: ReactMarkdown + rehypeRaw sinks use rehypeSanitize and DOMPurify.sanitize', () => {
        it('verifies WeeklyInsightsCard.tsx includes rehypeSanitize and DOMPurify.sanitize', () => {
            const filePath = path.resolve(process.cwd(), 'src/components/views/WeeklyInsightsCard.tsx');
            const content = fs.readFileSync(filePath, 'utf-8');

            expect(content).toContain("import rehypeSanitize from 'rehype-sanitize'");
            expect(content).toContain("import DOMPurify from 'dompurify'");
            expect(content).toContain('rehypePlugins={[rehypeRaw, rehypeSanitize]}');
            expect(content).toContain('DOMPurify.sanitize(insight.content)');
        });

        it('verifies ActivityDetailsModal.tsx includes rehypeSanitize and DOMPurify.sanitize on all AI feedback sinks', () => {
            const filePath = path.resolve(process.cwd(), 'src/components/ActivityDetailsModal.tsx');
            const content = fs.readFileSync(filePath, 'utf-8');

            expect(content).toContain("import rehypeSanitize from 'rehype-sanitize'");
            expect(content).toContain("import DOMPurify from 'dompurify'");

            // Ensure no raw rehypeRaw remains without rehypeSanitize
            const rawWithoutSanitizeMatches = content.match(/rehypePlugins=\{\[rehypeRaw\]\}/g);
            expect(rawWithoutSanitizeMatches).toBeNull();

            // Ensure all ReactMarkdown instances use [rehypeRaw, rehypeSanitize]
            const sanitizedPluginsMatches = content.match(/rehypePlugins=\{\[rehypeRaw, rehypeSanitize\]\}/g);
            expect(sanitizedPluginsMatches).not.toBeNull();
            expect(sanitizedPluginsMatches?.length).toBe(3);

            // Ensure plannedComparison, progressAnalysis, and goalTrajectory are wrapped in DOMPurify.sanitize
            expect(content).toContain('DOMPurify.sanitize(aiFeedback.plannedComparison');
            expect(content).toContain('DOMPurify.sanitize(aiFeedback.progressAnalysis)');
            expect(content).toContain('DOMPurify.sanitize(aiFeedback.goalTrajectory)');
        });

        it('confirms no other ReactMarkdown instances in Web/src use rehypeRaw without rehypeSanitize', () => {
            function scanDir(dir: string): string[] {
                const results: string[] = [];
                const list = fs.readdirSync(dir);
                for (const file of list) {
                    const fullPath = path.join(dir, file);
                    const stat = fs.statSync(fullPath);
                    if (stat.isDirectory()) {
                        results.push(...scanDir(fullPath));
                    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                        results.push(fullPath);
                    }
                }
                return results;
            }

            const allFiles = scanDir(path.resolve(process.cwd(), 'src'));
            for (const file of allFiles) {
                const text = fs.readFileSync(file, 'utf-8');
                if (text.includes('rehypeRaw')) {
                    const unsanitized = text.match(/rehypePlugins=\{\[rehypeRaw\]\}/g);
                    expect(unsanitized).toBeNull();
                    expect(text).toContain('rehypeSanitize');
                    expect(text).toContain('DOMPurify');
                }
            }
        });
    });

    describe('Test 2: DOMPurify sanitization strips malicious event handlers', () => {
        it('strips onerror and ontoggle from raw HTML payloads', () => {
            const maliciousPayload = '<img src=x onerror=alert(1)><details open ontoggle=alert(2)>';
            const sanitized = DOMPurify.sanitize(maliciousPayload);

            expect(sanitized).not.toContain('onerror');
            expect(sanitized).not.toContain('ontoggle');
            expect(sanitized).not.toContain('alert(1)');
            expect(sanitized).not.toContain('alert(2)');
            expect(sanitized).toContain('<img src="x">');
            expect(sanitized).toContain('<details open="">');
        });
    });

    describe('Test 3: AUTH_BOUND_RUNTIME_CACHES and AUTH_BOUND_CACHE_NAMES match', () => {
        it('verifies AUTH_BOUND_RUNTIME_CACHES in authCacheEviction.ts equals ["apis", "pages", "next-data"]', () => {
            expect(AUTH_BOUND_RUNTIME_CACHES).toEqual(['apis', 'pages', 'next-data']);
        });

        it('verifies AUTH_BOUND_CACHE_NAMES in public/sw-auth-guard.js equals ["apis", "pages", "next-data"]', () => {
            const swGuardPath = path.resolve(process.cwd(), 'public/sw-auth-guard.js');
            const swContent = fs.readFileSync(swGuardPath, 'utf-8');

            expect(swContent).toMatch(/var AUTH_BOUND_CACHE_NAMES = \['apis', 'pages', 'next-data'\];/);
        });
    });
});
