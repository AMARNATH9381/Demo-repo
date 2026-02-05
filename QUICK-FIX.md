# 🚨 Quick Fix Reference Card

## Problem: No Transcription Text Appearing

### ✅ Solution Checklist:

1. **Check Audio Meter** (bottom-left video preview)
   - Should show green bars (> 0.1%)
   - If 0.0% → Audio not captured

2. **Restart Session with Audio**
   - Stop current session
   - Click "Start Session"
   - ✅ **CHECK "Share tab audio"** in dialog
   - Click Share

3. **Verify in Console** (Press F12)
   ```
   Look for: [AUDIO] Sending chunk, level: 0.0234
   ```
   - If you see this → Audio is flowing ✅
   - If not → Audio not being captured ❌

4. **Test with YouTube**
   - Open YouTube in new tab
   - Start session and share that tab (with audio)
   - Play a video
   - Should see transcription within 2 seconds

---

## Problem: "System audio not detected"

### ✅ Quick Fix:
- You forgot to enable audio in the browser dialog
- **Restart and CHECK the audio option!**

### Browser-Specific:
- **Chrome/Edge:** Look for "Share tab audio" checkbox
- **Firefox:** Select "Share system audio" from dropdown

---

## Problem: Audio Meter Shows 0.0%

### ✅ Possible Causes:

1. **No audio playing**
   - Play music/video to generate sound
   
2. **Wrong source selected**
   - Share a tab/window that has audio
   
3. **System volume muted**
   - Check Windows volume mixer
   
4. **Browser permissions**
   - Allow microphone/audio access

---

## Problem: Backend Connection Error

### ✅ Quick Fix:
```bash
cd backend
npm install
npm start
```

Should see: `Server running on port 3001`

---

## Problem: Invalid API Key

### ✅ Quick Fix:
1. Get new key: https://aistudio.google.com/apikey
2. Click Settings in app
3. Paste key (starts with "AIzaSy...")
4. Click "Save Configuration"

---

## 🎯 Perfect Setup (Copy-Paste)

```bash
# 1. Install everything
npm install
cd backend && npm install && cd ..

# 2. Start app
start-app.bat

# 3. In browser (http://localhost:3000):
#    - Settings → Paste API key → Save
#    - Start Session → CHECK "Share tab audio" → Share
#    - Verify green audio meter appears
#    - Speak or play audio
#    - See transcription in 1-2 seconds
```

---

## 🔍 Debug Commands (Paste in Console)

### Check Backend:
```javascript
fetch('http://localhost:3001/api/resume')
  .then(r => r.json())
  .then(d => console.log('✅ Backend OK'))
  .catch(e => console.error('❌ Backend Down'));
```

### Check API Key:
```javascript
console.log('API Key:', localStorage.getItem('gemini_api_key') ? '✅ Set' : '❌ Missing');
```

### Test Audio Permissions:
```javascript
navigator.mediaDevices.getDisplayMedia({audio: true, video: true})
  .then(s => {
    console.log('✅ Audio tracks:', s.getAudioTracks().length);
    s.getTracks().forEach(t => t.stop());
  });
```

---

## 📊 Expected Behavior

### When Working:
1. Click "Start Session"
2. Select source + CHECK audio option
3. Audio meter: 0.1% - 50% (green bars)
4. Console: "[AUDIO] Sending chunk" messages
5. Transcription appears in 1-2 seconds
6. Assistant responds in 2-4 seconds

### Typical Audio Levels:
- **Music/Video:** 10-50%
- **Speech:** 1-10%
- **Background:** 0.1-1%
- **Silence:** 0.0%

---

## 🆘 Still Broken?

### Last Resort:
1. Close all browser tabs
2. Restart browser
3. Run `start-app.bat`
4. Try with YouTube tab
5. Check TROUBLESHOOTING.md

### Collect Debug Info:
- Browser + version
- Console errors (F12)
- Audio meter reading
- Backend status

---

## 💡 Pro Tips

✅ **DO:**
- Use Chrome or Edge
- Share a tab (not full screen)
- Test with YouTube first
- Check audio meter always
- Wait 2-3 seconds for transcription

❌ **DON'T:**
- Forget to enable audio in dialog
- Expect instant transcription
- Use Firefox (limited support)
- Share silent windows
- Ignore the audio meter

---

## 📞 Quick Links

- **Get API Key:** https://aistudio.google.com/apikey
- **Test Audio:** Open `audio-test.html`
- **Full Guide:** See `TROUBLESHOOTING.md`
- **Changes:** See `IMPROVEMENTS.md`
