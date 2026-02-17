export function safeStringify(value: unknown, space?: string | number): string {
    return JSON.stringify(value, (_, val) => {
        return typeof val === 'bigint' ? val.toString() : val;
    }, space);
}

export function safeStringifyResponse(data: unknown): Response {
    const jsonString = safeStringify(data);
    return new Response(jsonString, {
        headers: { 'Content-Type': 'application/json' }
    });
}
