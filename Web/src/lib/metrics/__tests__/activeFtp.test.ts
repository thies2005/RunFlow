import { resolveActiveFtp } from '../activeFtp';

describe('active FTP provenance', () => {
    it('uses manual FTP in preference to an estimate', () => {
        expect(resolveActiveFtp(240, 260, true)).toEqual({ watts: 240, source: 'manual' });
    });
    it('uses an estimate only when enabled and available', () => {
        expect(resolveActiveFtp(null, 260, true)).toEqual({ watts: 260, source: 'estimated' });
        expect(resolveActiveFtp(null, 260, false)).toEqual({ watts: null, source: 'missing' });
        expect(resolveActiveFtp(null, null, true)).toEqual({ watts: null, source: 'missing' });
        expect(resolveActiveFtp(0, 0, true)).toEqual({ watts: null, source: 'missing' });
    });
});
