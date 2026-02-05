console.log('--- TYPE SANITY CHECK ---');
console.log('Process Type:', process.type);
console.log('Process Versions Electron:', process.versions.electron);
console.log('Process Versions Node:', process.versions.node);
try {
    const electron = require('electron');
    console.log('Electron Require Type:', typeof electron);
    if (typeof electron === 'string') {
        console.log('Got Path String:', electron);
    } else {
        console.log('Electron Keys:', Object.keys(electron));
    }
} catch (e) {
    console.error('Require failed:', e);
}
console.log('--- END SANITY CHECK ---');
process.exit(0);
