const API_BASE = 'http://localhost:3001/api';

export const apiService = {
  async getSessions() {
    const response = await fetch(`${API_BASE}/sessions`);
    if (!response.ok) throw new Error('Failed to fetch sessions');
    return response.json();
  },

  async saveSession(session) {
    const response = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session)
    });
    if (!response.ok) throw new Error('Failed to save session');
    return response.json();
  },

  async deleteSession(id) {
    const response = await fetch(`${API_BASE}/sessions/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete session');
    return response.json();
  },

  async clearAllSessions() {
    const response = await fetch(`${API_BASE}/sessions`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to clear sessions');
    return response.json();
  },

  async getResume() {
    const response = await fetch(`${API_BASE}/resume`);
    if (!response.ok) throw new Error('Failed to fetch resume');
    return response.json();
  },

  async saveResume(resumeText) {
    const response = await fetch(`${API_BASE}/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText })
    });
    if (!response.ok) throw new Error('Failed to save resume');
    return response.json();
  }
};