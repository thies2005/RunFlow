
const fs = require('fs');
const zlib = require('zlib');

const BACKUP_PATH = 'C:/Users/thies/Antigravity/Full RunFlow/runflow-backup-2026-02-11T15-58-51-536Z.sql.gz';

async function start() {
    try {
        const stream = fs.createReadStream(BACKUP_PATH).pipe(zlib.createGunzip());

        let first = true;
        stream.on('data', (chunk) => {
            if (first) {
                console.log('--- FILE HEADER ---');
                const s = chunk.toString('utf8');
                console.log(s.substring(0, 500));

                if (s.startsWith('PGDMP')) {
                    console.log('\nFORMAT: Postgres Custom (Binary)');
                } else if (s.startsWith('--') || s.includes('CREATE') || s.includes('SET')) {
                    console.log('\nFORMAT: SQL Text');
                } else {
                    console.log('\nFORMAT: Unknown/Binary');
                }
                first = false;
                stream.destroy();
            }
        });

        stream.on('error', (e) => console.error('Stream error:', e.message));

    } catch (e) {
        console.error(e);
    }
}

start();
