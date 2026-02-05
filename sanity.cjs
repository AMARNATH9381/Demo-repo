const electron = require('electron');
console.log('--- CJS SANITY CHECK ---');
console.log('Keys:', Object.keys(electron));
try {
    const { app } = electron;
    console.log('Is App Present:', !!app);
} catch (e) {
    console.error('Destructure failed:', e);
}
console.log('--- END SANITY CHECK ---');
process.exit(0);
