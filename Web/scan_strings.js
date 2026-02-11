
const fs = require('fs');
const zlib = require('zlib');
const { createDecipheriv } = require('crypto');

const BACKUP_PATH = 'C:/Users/thies/Antigravity/Full RunFlow/runflow-backup-2026-02-11T15-58-51-536Z.sql.gz';
const KEY_BASE64 = 'biQGWN2GVnCScfVKmn3/dH8Ky203KM9AEJtFypnQwVE=';
const KEY = Buffer.from(KEY_BASE64, 'base64');
const ALGORITHM = 'aes-256-gcm';

function decryptToken(encryptedToken) {
    try {
        if (!encryptedToken) return null;
        const combined = Buffer.from(encryptedToken, 'base64');
        if (combined.length < 32) return `[PLAINTEXT]`;

        const iv = combined.subarray(0, 16);
        const authTag = combined.subarray(16, 32);
        const ciphertext = combined.subarray(32);

        const decipher = createDecipheriv(ALGORITHM, KEY, iv);
        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([
            decipher.update(ciphertext),
            decipher.final()
        ]);

        return `[SUCCESS: ${decrypted.toString('utf8')}]`;
    } catch (error) {
        return null;
    }
}

async function start() {
    try {
        const stream = fs.createReadStream(BACKUP_PATH).pipe(zlib.createGunzip());

        let buffer = '';

        stream.on('data', (chunk) => {
            buffer += chunk.toString('binary');

            // Look for alphanumeric+special strings
            const matches = buffer.match(/[A-Za-z0-9+/=]{30,}/g);
            if (matches) {
                for (const m of matches) {
                    if (m.length > 200) continue;

                    const decrypted = decryptToken(m);
                    if (decrypted) {
                        console.log(`FOUND DECRYPTABLE TOKEN: ${m.substring(0, 10)}... -> ${decrypted}`);
                    }
                }
            }
            buffer = buffer.slice(-100);
        });

        stream.on('end', () => console.log('Finished scanning.'));
        stream.on('error', (e) => console.error(e));

    } catch (e) {
        console.error(e);
    }
}

start();
