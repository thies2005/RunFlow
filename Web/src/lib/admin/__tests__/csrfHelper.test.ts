import { getCsrfToken, csrfHeaders } from '../csrfHelper';

describe('csrfHelper', () => {
    let originalDocument: any;

    beforeAll(() => {
        // Save the original document to restore it later
        originalDocument = global.document;
    });

    afterAll(() => {
        // Restore the original document
        global.document = originalDocument;
    });

    afterEach(() => {
        // Clear document.cookie after each test if it exists
        if (global.document) {
            Object.defineProperty(global.document, 'cookie', {
                writable: true,
                value: '',
            });
        }
    });

    describe('getCsrfToken', () => {
        it('should return empty string if document is undefined', () => {
            // Temporarily remove document
            const tempDoc = global.document;
            // @ts-ignore
            delete global.document;

            expect(getCsrfToken()).toBe('');

            // Restore document
            global.document = tempDoc;
        });

        it('should return empty string if cookie is empty', () => {
            Object.defineProperty(global.document, 'cookie', {
                writable: true,
                value: '',
            });
            expect(getCsrfToken()).toBe('');
        });

        it('should return empty string if csrf_token_client is not present', () => {
            Object.defineProperty(global.document, 'cookie', {
                writable: true,
                value: 'other_cookie=value; another_cookie=value2',
            });
            expect(getCsrfToken()).toBe('');
        });

        it('should return the token when csrf_token_client is present', () => {
            Object.defineProperty(global.document, 'cookie', {
                writable: true,
                value: 'csrf_token_client=my_test_token; other_cookie=value',
            });
            expect(getCsrfToken()).toBe('my_test_token');
        });

        it('should return the token when csrf_token_client is the only cookie', () => {
            Object.defineProperty(global.document, 'cookie', {
                writable: true,
                value: 'csrf_token_client=my_test_token',
            });
            expect(getCsrfToken()).toBe('my_test_token');
        });

        it('should decode URI components in the token value', () => {
            Object.defineProperty(global.document, 'cookie', {
                writable: true,
                value: 'csrf_token_client=my%20test%20token',
            });
            expect(getCsrfToken()).toBe('my test token');
        });

        it('should handle cookies with leading/trailing spaces', () => {
            Object.defineProperty(global.document, 'cookie', {
                writable: true,
                value: ' other_cookie=value ; csrf_token_client=my_test_token ; ',
            });
            expect(getCsrfToken()).toBe('my_test_token');
        });

        it('should handle csrf_token_client without a value', () => {
            Object.defineProperty(global.document, 'cookie', {
                writable: true,
                value: 'csrf_token_client=',
            });
            expect(getCsrfToken()).toBe('');
        });
    });

    describe('csrfHeaders', () => {
        beforeEach(() => {
            // Set a default token for csrfHeaders tests
            Object.defineProperty(global.document, 'cookie', {
                writable: true,
                value: 'csrf_token_client=default_token',
            });
        });

        it('should return default headers with token', () => {
            const headers = csrfHeaders();
            expect(headers).toEqual({
                'Content-Type': 'application/json',
                'X-CSRF-Token': 'default_token',
            });
        });

        it('should merge extra headers', () => {
            const extra = {
                'Authorization': 'Bearer test',
                'X-Custom-Header': 'custom_value',
            };
            const headers = csrfHeaders(extra);
            expect(headers).toEqual({
                'Content-Type': 'application/json',
                'X-CSRF-Token': 'default_token',
                'Authorization': 'Bearer test',
                'X-Custom-Header': 'custom_value',
            });
        });

        it('should override default Content-Type if provided in extra', () => {
            const extra = {
                'Content-Type': 'application/x-www-form-urlencoded',
            };
            const headers = csrfHeaders(extra);
            expect(headers).toEqual({
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRF-Token': 'default_token',
            });
        });

        it('should include empty token if cookie is not set', () => {
            Object.defineProperty(global.document, 'cookie', {
                writable: true,
                value: '',
            });
            const headers = csrfHeaders();
            expect(headers).toEqual({
                'Content-Type': 'application/json',
                'X-CSRF-Token': '',
            });
        });
    });
});
