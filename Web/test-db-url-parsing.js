const { URL } = require('url');

// Robust URL Implementation (mocking the one in route.ts)
function parseWithUrl(dbUrl) {
    if (!dbUrl) return { error: 'No URL' };
    try {
        const targetUrl = dbUrl.includes('://') ? dbUrl : `postgresql://${dbUrl}`;
        const parsed = new URL(targetUrl);
        return {
            dbUser: decodeURIComponent(parsed.username),
            dbPass: decodeURIComponent(parsed.password),
            dbHost: parsed.hostname,
            dbPort: parsed.port || '5432',
            dbName: parsed.pathname.slice(1) // Remove leading slash
        };
    } catch (e) {
        return { error: e.message };
    }
}

const testCases = [
    {
        name: 'Standard URL',
        url: 'postgresql://user:pass@localhost:5432/dbname',
        expected: { dbUser: 'user', dbPass: 'pass', dbHost: 'localhost', dbPort: '5432', dbName: 'dbname' }
    },
    {
        name: 'Password with @ (Encoded)',
        url: 'postgresql://user:p%40ss@localhost:5432/dbname',
        expected: { dbUser: 'user', dbPass: 'p@ss', dbHost: 'localhost', dbPort: '5432', dbName: 'dbname' }
    },
    {
        name: 'Postgres Scheme (postgres://)',
        url: 'postgres://user:pass@localhost:5432/dbname',
        expected: { dbUser: 'user', dbPass: 'pass', dbHost: 'localhost', dbPort: '5432', dbName: 'dbname' }
    },
    {
        name: 'Encoded Special Chars',
        url: 'postgresql://user:p%5Essword@localhost:5432/dbname',
        expected: { dbUser: 'user', dbPass: 'p^ssword', dbHost: 'localhost', dbPort: '5432', dbName: 'dbname' }
    }
];

console.log('--- Database URL Parsing Verification (New Logic) ---');

let allPassed = true;

testCases.forEach(test => {
    console.log(`\nTest Case: ${test.name}`);

    const result = parseWithUrl(test.url);

    if (result.error) {
        console.log('FAILED (Error):', result.error);
        allPassed = false;
    } else {
        const matches = JSON.stringify(result) === JSON.stringify(test.expected);
        if (matches) {
            console.log('SUCCESS');
        } else {
            console.log('FAILED (Mismatch)');
            console.log('  Expected:', test.expected);
            console.log('  Actual:  ', result);
            allPassed = false;
        }
    }
});

if (allPassed) console.log('\nALL TESTS PASSED');
else console.log('\nSOME TESTS FAILED');
