<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1UG39uN8TWzriEpoJOxCca_zYab3DHvFA

## ⚠️ IMPORTANT: Recent Fixes Applied

**Issues Fixed:**
- ✅ System audio not being captured (sample rate mismatch)
- ✅ No transcription text appearing (noise gate too high)
- ✅ Audio level monitoring added
- ✅ Backend startup automation

**See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed fixes and debugging.**

## Run Locally

**Prerequisites:** Node.js

### Quick Start (Recommended)

1. Install dependencies:
   ```bash
   npm install
   cd backend && npm install && cd ..
   ```

2. Set the `GEMINI_API_KEY`:
   - Get your key from: https://aistudio.google.com/apikey
   - Open the app → Click Settings → Paste your API key

3. Run the app:
   ```bash
   start-app.bat
   ```
   This starts both backend (port 3001) and frontend (port 3000)

### Manual Start

```bash
# Terminal 1 - Backend
cd backend
npm install
npm start

# Terminal 2 - Frontend  
npm install
npm run dev
```

## 🎤 Audio Capture Setup

**CRITICAL:** When starting a session, you MUST:

1. Click "Start Session"
2. In the browser dialog, select the tab/window/screen
3. **✅ CHECK "Share tab audio" or "Share system audio"**
4. Click "Share"

**Verify Audio is Working:**
- Look at the video preview box (bottom left)
- You should see a green audio level meter
- Percentage should be > 0.1% when audio is playing
- If 0.0%, audio is NOT being captured

## 🧪 Test Audio Capture

Before using the app, test if audio capture works:

```bash
# Open in browser
audio-test.html
```

This standalone test page verifies:
- Browser permissions
- System audio capture
- Audio level detection

## 📋 Troubleshooting

### No transcription appearing?

1. **Check audio meter** - Should show green bars
2. **Check console** (F12) - Look for "[AUDIO] Sending chunk" messages
3. **Verify API key** - Settings → Re-enter key
4. **Try different source** - Share a YouTube tab with audio

### "System audio not detected" error?

- You didn't check the audio option in browser dialog
- Restart session and explicitly select audio sharing
- Use Chrome/Edge (best support)

### Backend connection errors?

```bash
cd backend
npm start
```

Should see: "Server running on port 3001"

**Full troubleshooting guide:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

## 🔧 Technical Changes

### What was fixed:

1. **Audio sample rate**: 16kHz → 48kHz (native system audio)
2. **Noise gate**: 0.01 → 0.001 (system audio is quieter)
3. **Downsampling**: Added 48kHz → 16kHz conversion for Gemini
4. **Audio monitoring**: Visual meter + debug logs
5. **Startup automation**: `start-app.bat` script

### Files modified:
- `App.tsx` - Audio capture and processing
- `public/audio-processor.js` - Downsampling logic
- `start-app.bat` - Startup script (NEW)
- `audio-test.html` - Audio test tool (NEW)
- `TROUBLESHOOTING.md` - Debug guide (NEW)
