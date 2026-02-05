# Meeting Pilot - Troubleshooting Guide

## 🔧 Issues Fixed

### 1. System Audio Not Captured
**Problem:** Audio tracks exist but no audio data flows
**Solution:** 
- Increased sample rate to 48kHz (native system audio rate)
- Added audio track verification logging
- Lowered noise gate from 0.01 to 0.001

### 2. No Transcription Display
**Problem:** Audio sent but no text appears
**Solution:**
- Added downsampling from 48kHz → 16kHz in audio-processor.js
- Fixed buffer size for proper audio chunking
- Added debug logging for audio levels

### 3. Backend Not Running
**Problem:** API calls fail silently
**Solution:**
- Created `start-app.bat` to launch both servers
- Backend runs on port 3001, frontend on port 3000

---

## 🚀 How to Start the App

### Option 1: Use Startup Script (Recommended)
```bash
start-app.bat
```

### Option 2: Manual Start
```bash
# Terminal 1 - Backend
cd backend
npm install
npm start

# Terminal 2 - Frontend
npm install
npm run dev
```

---

## ✅ Pre-Flight Checklist

Before starting a session:

1. **Backend Running?**
   - Check console shows: "Server running on port 3001"
   - Test: Open http://localhost:3001/api/resume

2. **API Key Configured?**
   - Click Settings → Enter Gemini API Key
   - Get key from: https://aistudio.google.com/apikey

3. **Browser Permissions?**
   - Chrome/Edge: Allow screen sharing
   - Must select "Share Tab Audio" or "Share System Audio"

---

## 🎤 Audio Capture Verification

### Step 1: Start Session
Click "Start Session" → Select screen/tab to share

### Step 2: Check Audio Indicator
Look at the video preview box (bottom left):
- **Audio Level meter should show green bars**
- **Percentage should be > 0.1%**
- If 0.0% → Audio not being captured

### Step 3: Browser Dialog
When sharing screen, you MUST:
- ✅ Check "Share tab audio" (for tab sharing)
- ✅ Select "Share system audio" (for window/screen sharing)
- ❌ Don't just click "Share" without audio option

### Step 4: Console Logs
Open DevTools (F12) → Console tab:
```
[AUDIO] Track settings: {sampleRate: 48000, ...}
[AUDIO] Track enabled: true
[AUDIO] Track muted: false
[AUDIO] Sending chunk, level: 0.0234
```

If you see "Sending chunk" → Audio is flowing ✅

---

## 🐛 Common Issues & Fixes

### Issue 1: "System audio not detected"
**Cause:** No audio track in stream
**Fix:**
1. Cancel and restart session
2. In browser dialog, explicitly select audio option
3. Try different browser (Chrome works best)

### Issue 2: Audio level shows 0.0%
**Cause:** Audio track exists but no data
**Fix:**
1. Check system volume is not muted
2. Play audio/video to generate sound
3. Try sharing a different tab/window
4. Restart browser

### Issue 3: Audio detected but no transcription
**Cause:** Gemini API connection issue
**Fix:**
1. Check console for errors
2. Verify API key is valid
3. Check internet connection
4. Model might be rate-limited (wait 1 minute)

### Issue 4: "Connection Failed" error
**Cause:** Invalid API key or network issue
**Fix:**
1. Settings → Re-enter API key
2. Ensure key starts with "AIzaSy..."
3. Check firewall/antivirus blocking WebSocket
4. Try different network

### Issue 5: Backend errors
**Cause:** Backend server not running
**Fix:**
```bash
cd backend
npm install
npm start
```
Should see: "Server running on port 3001"

---

## 🔍 Debug Mode

### Enable Verbose Logging
Open DevTools Console (F12) and run:
```javascript
localStorage.setItem('debug', 'true');
```

### Check Audio Pipeline
```javascript
// Check if audio context is running
console.log(audioContextRef.current?.state); // Should be "running"

// Check active stream
console.log(activeStreamRef.current?.getAudioTracks()[0]?.getSettings());
```

---

## 📊 Expected Behavior

### When Working Correctly:
1. Click "Start Session"
2. Select screen/tab with audio option
3. Audio level meter shows green bars (0.1% - 50%)
4. Console shows "[AUDIO] Sending chunk" messages
5. Within 2-3 seconds, "Captured Audio" appears with transcription
6. Assistant responds with text

### Typical Latency:
- Audio → Transcription: 1-2 seconds
- Question → Response: 2-4 seconds

---

## 🆘 Still Not Working?

### Collect Debug Info:
1. Open DevTools (F12) → Console tab
2. Start session and wait 10 seconds
3. Copy all console output
4. Check for errors in red

### System Info Needed:
- Browser: Chrome/Edge/Firefox + version
- OS: Windows 10/11
- Audio source: Tab/Window/Screen
- Error messages from console

### Test with Simple Audio:
1. Open YouTube in a tab
2. Start Meeting Pilot session
3. Share that YouTube tab (with audio)
4. Play a video
5. Check if transcription appears

---

## 🎯 Quick Test

Run this in console to verify setup:
```javascript
// Test 1: Backend reachable
fetch('http://localhost:3001/api/resume')
  .then(r => r.json())
  .then(d => console.log('✅ Backend OK:', d))
  .catch(e => console.error('❌ Backend Error:', e));

// Test 2: API Key set
console.log('API Key:', localStorage.getItem('gemini_api_key') ? '✅ Set' : '❌ Missing');

// Test 3: Audio permissions
navigator.mediaDevices.getDisplayMedia({audio: true, video: true})
  .then(s => {
    console.log('✅ Audio tracks:', s.getAudioTracks().length);
    s.getTracks().forEach(t => t.stop());
  })
  .catch(e => console.error('❌ Permission Error:', e));
```

---

## 📝 Changes Made to Fix Issues

### App.tsx
- Line 237: Sample rate 16kHz → 48kHz
- Line 289: Noise gate 0.01 → 0.001
- Line 220: Added audio track verification
- Line 293: Added audio level logging
- Added visual audio level meter

### audio-processor.js
- Added 48kHz → 16kHz downsampling
- Increased buffer size 512 → 2048
- Fixed buffer slicing

### New Files
- `start-app.bat`: Launch script
- `TROUBLESHOOTING.md`: This guide

---

## 💡 Pro Tips

1. **Use Chrome**: Best WebRTC support
2. **Share Tab**: More reliable than full screen
3. **Test with YouTube**: Easy way to verify audio
4. **Check Audio Meter**: Should always show activity
5. **Wait 2-3 seconds**: Transcription isn't instant
6. **Session Limit**: 15 minutes max (Gemini limit)

---

## 📞 Support

If issues persist after trying all fixes:
1. Check Gemini API status: https://status.cloud.google.com/
2. Verify model availability: `gemini-2.5-flash-native-audio-preview-12-2025`
3. Test API key with: https://aistudio.google.com/
