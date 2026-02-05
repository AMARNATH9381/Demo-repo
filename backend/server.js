import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query, initDB } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.get('/api/sessions', async (req, res) => {
  try {
    const result = await query('SELECT * FROM meeting_sessions ORDER BY created_at DESC');
    // Parse the JSON string back to object for the frontend
    const rows = result.rows.map(row => ({
      ...row,
      transcript: JSON.parse(row.transcript)
    }));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sessions', async (req, res) => {
  try {
    const { id, date, title, transcript } = req.body;
    await query(
      'INSERT INTO meeting_sessions (id, date, title, transcript) VALUES (?, ?, ?, ?)',
      [id, date, title, JSON.stringify(transcript)]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sessions/:id', async (req, res) => {
  try {
    await query('DELETE FROM meeting_sessions WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sessions', async (req, res) => {
  try {
    await query('DELETE FROM meeting_sessions');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/resume', async (req, res) => {
  try {
    const result = await query('SELECT resume_text FROM user_settings ORDER BY id DESC LIMIT 1');
    res.json({ resumeText: result.rows[0]?.resume_text || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/resume', async (req, res) => {
  try {
    const { resumeText } = req.body;
    await query('DELETE FROM user_settings');
    await query('INSERT INTO user_settings (resume_text) VALUES (?)', [resumeText]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initDB();
});
