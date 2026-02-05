# 🔍 Debug: No Transcription Appearing

## Quick Checks:

### 1. Check Audio Meter
Look at the video preview (bottom-left):
- Is the audio meter showing green bars?
- Is the percentage > 0.1%?
- If 0.0% → Audio not being captured

### 2. Check Console Logs
Press F12 (or Ctrl+Shift+I) to open Developer Tools:
- Go to Console tab
- Look for these messages:
  - `[AUDIO] Track settings: {sampleRate: 48000}`
  - `[AUDIO] Sending chunk, level: 0.XXXX`
  - `[GEMINI] Attempting to connect`

### 3. Check API Key
- Settings → Verify API key is entered
- Key should start with "AIzaSy..."
- Try re-entering the key

### 4. Check Internet Connection
- Gemini API requires internet
- Check if other websites work

### 5. Check Session Status
- Top-right should show "Active Pilot" (green)
- If not, session didn't start properly

## Common Issues:

### Issue 1: Audio Meter at 0.0%
**Fix:** Audio not being captured
- Restart session
- Make sure audio is playing
- Check Windows volume not muted

### Issue 2: No Console Logs
**Fix:** Backend or connection issue
- Check if backend is running (should auto-start)
- Restart the app

### Issue 3: API Key Error
**Fix:** Invalid or expired key
- Get new key: https://aistudio.google.com/apikey
- Re-enter in Settings

### Issue 4: "Connection Failed" Error
**Fix:** Network or API issue
- Check internet connection
- Wait 1 minute (rate limit)
- Try again

## Debug Commands:

Open Console (F12) and paste:

```javascript
// Check if session is connected
console.log('Status:', status);

// Check audio level
console.log('Audio Level:', audioLevel);

// Check API key
console.log('API Key Set:', !!localStorage.getItem('gemini_api_key'));
```

## What to Report:

1. Audio meter reading: ____%
2. Console errors: Yes/No
3. "Active Pilot" showing: Yes/No
4. Any error messages: _______
