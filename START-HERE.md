# 🚀 Meeting Pilot - Quick Start

## ✅ Your App is Ready!

### Run the App:
```
release\win-unpacked\Meeting Pilot.exe
```

Or install it:
```
release\Meeting Pilot Setup 0.0.0.exe
```

---

## 📋 First Time Setup

1. **Run the app** - Double-click `Meeting Pilot.exe`
2. **Configure API Key**:
   - Click "Settings" (top-right)
   - Paste your Gemini API key
   - Click "Save Configuration"
   - Get key from: https://aistudio.google.com/apikey

3. **Start Session**:
   - Click "Start Session"
   - App automatically captures your screen
   - **Check audio meter** (bottom-left video preview)
   - Should show green bars when audio plays

4. **Verify Audio**:
   - Play music or speak
   - Audio meter should be > 0.1%
   - Transcription appears in 1-2 seconds

---

## ⚠️ Important: Audio Capture

The desktop app uses **system audio loopback** - it automatically captures all system audio.

**If no transcription appears:**
1. Check audio meter shows green bars
2. Play audio to test (YouTube, music, etc.)
3. Check Windows audio is not muted
4. See TROUBLESHOOTING.md for details

---

## 🎯 What Was Fixed

✅ Audio sample rate: 16kHz → 48kHz
✅ Noise gate: 0.01 → 0.001
✅ Added downsampling: 48kHz → 16kHz
✅ Added visual audio meter
✅ Backend auto-starts with app

---

## 📚 Documentation

- **QUICK-FIX.md** - Common issues and solutions
- **TROUBLESHOOTING.md** - Detailed debugging guide
- **WINDOWS-APP.md** - Desktop app details
- **IMPROVEMENTS.md** - Technical changes

---

## 💡 Pro Tips

- App runs in system tray (bottom-right)
- Right-click tray icon to show/quit
- Click "HUD Overlay" for floating transcript
- Audio meter should always show activity

---

## 🆘 Need Help?

**No transcription?**
→ Check audio meter, see QUICK-FIX.md

**Backend errors?**
→ Backend starts automatically with app

**Build from source?**
→ Run `build-app.bat`

---

Enjoy your fixed Meeting Pilot app! 🎉
