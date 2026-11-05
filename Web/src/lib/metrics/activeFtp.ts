/** Resolve the FTP used for derived cycling metrics. Manual settings take precedence. */
export function resolveActiveFtp(manual: number | null | undefined, estimate: number | null | undefined, autoEstimate: boolean | null | undefined) {
    if (manual != null && manual > 0) return { watts: manual, source: 'manual' as const };
    if (autoEstimate && estimate != null && estimate > 0) return { watts: estimate, source: 'estimated' as const };
    return { watts: null, source: 'missing' as const };
}
