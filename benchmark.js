const { performance } = require('perf_hooks');

async function mockFetch(url, options) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                ok: true,
                json: async () => ({ duplicate: Math.random() > 0.8 })
            });
        }, 50); // mock network delay
    });
}

const activities = Array.from({ length: 50 }, (_, i) => ({
    name: `Activity ${i}`,
    startDate: new Date(),
    type: 'RUN',
    distance: 5000,
    duration: 1800,
    averageHr: 150,
    hrZones: {}
}));

async function sequentialSync() {
    let synced = 0;
    let skipped = 0;
    let errors = 0;

    for (const activity of activities) {
        try {
            const response = await mockFetch('/api/activities', {});
            if (response.ok) {
                const data = await response.json();
                if (data.duplicate) {
                    skipped++;
                } else {
                    synced++;
                }
            } else {
                errors++;
            }
        } catch (error) {
            errors++;
        }
    }
    return { synced, errors, skipped };
}

async function parallelSync() {
    let synced = 0;
    let skipped = 0;
    let errors = 0;

    const promises = activities.map(async (activity) => {
        try {
            const response = await mockFetch('/api/activities', {});
            if (response.ok) {
                const data = await response.json();
                if (data.duplicate) {
                    return { type: 'skipped' };
                } else {
                    return { type: 'synced' };
                }
            } else {
                return { type: 'error' };
            }
        } catch (error) {
            return { type: 'error' };
        }
    });

    const results = await Promise.all(promises);
    for (const result of results) {
        if (result.type === 'synced') synced++;
        else if (result.type === 'skipped') skipped++;
        else if (result.type === 'error') errors++;
    }

    return { synced, errors, skipped };
}

async function run() {
    console.log('Running sequential...');
    const startSeq = performance.now();
    await sequentialSync();
    const endSeq = performance.now();
    console.log(`Sequential took ${(endSeq - startSeq).toFixed(2)} ms`);

    console.log('Running parallel...');
    const startPar = performance.now();
    await parallelSync();
    const endPar = performance.now();
    console.log(`Parallel took ${(endPar - startPar).toFixed(2)} ms`);

    console.log(`Speedup: ${((endSeq - startSeq) / (endPar - startPar)).toFixed(2)}x`);
}

run();
