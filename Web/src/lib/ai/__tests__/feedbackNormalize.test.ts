/**
 * @jest-environment node
 */
import { normalizeLatexSectionHeaders } from '../feedback';

describe('normalizeLatexSectionHeaders', () => {
    it('converts \\section*{…} lines to markdown # headers', () => {
        const raw = [
            '\\section*{Planned Comparison}',
            'Solid pace execution.',
            '\\section*{Progress Analysis}',
            'Fitness is trending up.',
        ].join('\n');
        const out = normalizeLatexSectionHeaders(raw);
        expect(out).toContain('# Planned Comparison');
        expect(out).toContain('# Progress Analysis');
        expect(out).not.toContain('\\section');
    });

    it('maps \\subsection and deeper levels to ##+', () => {
        const out = normalizeLatexSectionHeaders('\\subsection{Details}\n\\subsubsection{More}');
        expect(out.split('\n')[0]).toBe('## Details');
        expect(out.split('\n')[1]).toBe('### More');
    });

    it('handles starred and unstarred forms and stray double backslashes', () => {
        expect(normalizeLatexSectionHeaders('\\section{Goal Trajectory}')).toBe('# Goal Trajectory');
        expect(normalizeLatexSectionHeaders('\\\\section*{Goal Trajectory}')).toBe('# Goal Trajectory');
    });

    it('leaves prose and inline occurrences untouched', () => {
        const prose = 'The word \\section appears mid-sentence, not as a header.';
        expect(normalizeLatexSectionHeaders(prose)).toBe(prose);
        const inline = 'run \\section*{weird} ok';
        expect(normalizeLatexSectionHeaders(inline)).toBe(inline);
    });

    it('caps the heading depth at 6 like markdown', () => {
        expect(normalizeLatexSectionHeaders('\\subsubsubsubsubsection{Deep}')).toBe('###### Deep');
    });
});
