import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine database path. 
// In development, it's in the backend folder.
// In production (Electron), it should be in the user's AppData.
// For simplicity in this step, we'll store it locally or let the main process pass the path via ENV.
// But mostly commonly for starters:
const dbName = 'meeting_pilot.db';

// Use a distinct path for dev vs prod if needed. For now, local to this file is fine for dev.
// We will look for an environment variable DB_PATH set by Electron, or default to local.
const dbPath = process.env.DB_PATH || path.resolve(__dirname, dbName);

// Ensure the directory exists if it's an absolute path
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to SQLite database at', dbPath);
    }
});

// Helper to run query (mimic pg pool.query somewhat, but for sqlite)
// SQLite's .all() returns an array of rows. .run() returns metadata (for inserts/updates).
export const query = (text, params = []) => {
    return new Promise((resolve, reject) => {
        // Simple heuristic: SELECT uses .all, others use .run
        // This is a naive wrapper to fit the existing code style if possible, 
        // but `server.js` expects { rows: ... } structure for SELECTs.
        const method = text.trim().toUpperCase().startsWith('SELECT') ? 'all' : 'run';
        
        db[method](text, params, function(err, rows) {
            if (err) {
                return reject(err);
            }
            // If run(), 'this' contains changes, lastID etc.
            if (method === 'run') {
                resolve({ rows: [], rowCount: this.changes, ...this });
            } else {
                resolve({ rows: rows, rowCount: rows.length });
            }
        });
    });
};

export const initDB = async () => {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS meeting_sessions (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                title TEXT NOT NULL,
                transcript TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Note: JSONB replaced with TEXT. SQLite stores JSON as TEXT.
        
        await query(`
            CREATE TABLE IF NOT EXISTS user_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                resume_text TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('SQLite Database initialized');
    } catch (err) {
        console.error('Database initialization error:', err);
    }
};

export default db;
