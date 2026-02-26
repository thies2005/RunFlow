export function parseIntSafe(val: number | undefined): number | undefined {
    if (val === undefined) return undefined;
    return Math.round(val);
}

export function parseFloatSafe(val: number | undefined): number | undefined {
    if (val === undefined) return undefined;
    return val;
}
