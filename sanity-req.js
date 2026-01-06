import { createRequire } from 'module';
const require = createRequire(import.meta.url);
console.log('--- REQUIRE SANITY CHECK ---');
try {
    const electron = require('electron');
    console.log('Electron Type:', typeof electron);
    if (typeof electron === 'string') {
        console.log('Got Path String:', electron);
    } else {
        console.log('Keys:', Object.keys(electron));
        console.log('Is App Present:', !!electron.app);
    }
} catch (e) {
    console.error('Require failed:', e);
}
console.log('--- END SANITY CHECK ---');
process.exit(0);
