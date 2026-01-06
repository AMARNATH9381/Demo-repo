import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 3001;

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'meeting_pilot',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize database
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meeting_sessions (
        id VARCHAR(255) PRIMARY KEY,
        date VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        transcript JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        resume_text TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Database initialized');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
};

// Routes
app.get('/api/sessions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM meeting_sessions ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sessions', async (req, res) => {
  try {
    const { id, date, title, transcript } = req.body;
    await pool.query(
      'INSERT INTO meeting_sessions (id, date, title, transcript) VALUES ($1, $2, $3, $4)',
      [id, date, title, JSON.stringify(transcript)]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sessions/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM meeting_sessions WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sessions', async (req, res) => {
  try {
    await pool.query('DELETE FROM meeting_sessions');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/resume', async (req, res) => {
  try {
    const result = await pool.query('SELECT resume_text FROM user_settings ORDER BY id DESC LIMIT 1');
    res.json({ resumeText: result.rows[0]?.resume_text || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/resume', async (req, res) => {
  try {
    const { resumeText } = req.body;
    await pool.query('DELETE FROM user_settings');
    await pool.query('INSERT INTO user_settings (resume_text) VALUES ($1)', [resumeText]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initDB();
});