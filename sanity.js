import electron from 'electron';
console.log('--- ESM SANITY CHECK ---');
console.log('Electron Default Export:', electron);
try {
    const { app } = electron;
    console.log('Is App Present:', !!app);
} catch (e) {
    console.error('Destructure failed:', e);
}
console.log('--- END SANITY CHECK ---');
process.exit(0);
