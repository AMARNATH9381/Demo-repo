# Meeting Pilot - Dockerized Deployment

AI-powered meeting assistant with persistent data storage.

## 🚀 Quick Start with Docker

**Prerequisites:** Docker & Docker Compose

1. **Set your API key:**
   ```bash
   # Edit .env.local and add your Gemini API key
   GEMINI_API_KEY=your_actual_api_key_here
   ```

2. **Deploy everything:**
   ```bash
   ./deploy.sh
   ```

3. **Access your app:**
   - Frontend: http://localhost
   - API: http://localhost:3001

## 🏗️ Architecture

- **Frontend**: React app (Nginx)
- **Backend**: Node.js API (Express)
- **Database**: PostgreSQL
- **Storage**: All data persisted in database (no localStorage)

## 📊 Database Schema

**meeting_sessions**
- id, date, title, transcript (JSONB), created_at

**user_settings**
- id, resume_text, updated_at

## 🛠️ Manual Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up --build -d
```

## 🔧 Development

For local development without Docker:

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
npm install && npm run dev
```