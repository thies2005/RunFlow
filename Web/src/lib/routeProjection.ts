/** Project valid geographic fixes into a padded viewport, preserving local aspect ratio. */
export function projectRoute(input: unknown, width = 400, height = 220): [number, number][] {
    if (!Array.isArray(input) || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return [];
    const fixes = input.filter((p): p is [number, number] => Array.isArray(p) && p.length >= 2 &&
        typeof p[0] === 'number' && Number.isFinite(p[0]) && Math.abs(p[0]) <= 90 &&
        typeof p[1] === 'number' && Number.isFinite(p[1]) && Math.abs(p[1]) <= 180);
    if (fixes.length < 2) return [];
    const cosLat = Math.cos(fixes.reduce((sum, p) => sum + p[0], 0) / fixes.length * Math.PI / 180);
    let longitude = fixes[0][1];
    const projected = fixes.map(([lat, lng], i) => {
        if (i) { let delta = lng - fixes[i - 1][1]; if (delta > 180) delta -= 360; if (delta < -180) delta += 360; longitude += delta; }
        return [longitude * cosLat, -lat] as [number, number];
    });
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of projected) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    const span = Math.max((maxX - minX) / (width * .86), (maxY - minY) / (height * .86));
    if (span < 1e-12) return projected.map(() => [width / 2, height / 2]);
    return projected.map(([x, y]) => [width / 2 + (x - (minX + maxX) / 2) / span, height / 2 + (y - (minY + maxY) / 2) / span]);
}
