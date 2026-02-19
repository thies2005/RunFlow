import { safeStringify, safeStringifyResponse } from '../serializer';

describe('serializer', () => {
    describe('safeStringify', () => {
        it('should stringify basic types correctly', () => {
            expect(safeStringify('hello')).toBe('"hello"');
            expect(safeStringify(123)).toBe('123');
            expect(safeStringify(true)).toBe('true');
            expect(safeStringify(null)).toBe('null');
        });

        it('should stringify objects and arrays correctly', () => {
            const obj = { a: 1, b: 'test' };
            const arr = [1, 'test', true];
            expect(safeStringify(obj)).toBe('{"a":1,"b":"test"}');
            expect(safeStringify(arr)).toBe('[1,"test",true]');
        });

        it('should handle BigInt by converting to string', () => {
            const bigIntValue = BigInt(9007199254740991);
            expect(safeStringify(bigIntValue)).toBe('"9007199254740991"');
        });

        it('should handle BigInt nested in objects', () => {
            const obj = { id: BigInt(123), name: 'item' };
            expect(safeStringify(obj)).toBe('{"id":"123","name":"item"}');
        });

        it('should handle BigInt nested in arrays', () => {
            const arr = [BigInt(1), BigInt(2), 3];
            expect(safeStringify(arr)).toBe('["1","2",3]');
        });

        it('should handle mixed types with BigInt', () => {
             const mixed = {
                 id: BigInt(100),
                 values: [BigInt(200), 'string'],
                 meta: { count: BigInt(300) }
             };
             expect(safeStringify(mixed)).toBe('{"id":"100","values":["200","string"],"meta":{"count":"300"}}');
        });

        it('should respect the space argument for formatting', () => {
            const obj = { a: 1 };
            // The exact output depends on JSON.stringify behavior with space argument
            // Using a simple check
            expect(safeStringify(obj, 2)).toBe('{\n  "a": 1\n}');
        });
    });

    describe('safeStringifyResponse', () => {
        it('should return a Response object with correct body and headers', async () => {
            const data = { id: BigInt(123), success: true };
            const response = safeStringifyResponse(data);

            expect(response).toBeInstanceOf(Response);
            expect(response.headers.get('Content-Type')).toBe('application/json');

            const text = await response.text();
            expect(text).toBe('{"id":"123","success":true}');
            expect(response.status).toBe(200);
        });
    });
});
