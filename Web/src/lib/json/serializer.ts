export function safeStringify(value: unknown, space?: string | number): string {
    return JSON.stringify(value, (_, val) => {
        return typeof val === 'bigint' ? val.toString() : val;
    }, space);
}
