# 🪟 Windows Desktop App - Quick Start

## 🚀 Build the App (With All Fixes)

### Step 1: Build
```bash
build-app.bat
```

This will:
1. Install dependencies
2. Build the frontend with all fixes
3. Create Windows executable

### Step 2: Run
After build completes, run:
```
release\win-unpacked\Meeting Pilot.exe
```

Or install using:
```
release\Meeting Pilot Setup 0.0.0.exe
```

---

## ⚡ Quick Run (Use Existing Build)

If you want to test the current build (without fixes):
```
release_new\win-unpacked\Meeting Pilot.exe
```

**Note:** This build is OLD and doesn't have the audio fixes!

---

## 🔧 What the Desktop App Does

1. **Auto-starts backend** - No need to run backend manually
2. **System tray icon** - Runs in background
3. **No browser needed** - Standalone Windows app
4. **Auto screen capture** - Automatically selects screen

---

## 📋 First Time Setup

### 1. Run the App
Double-click `Meeting Pilot.exe`

### 2. Configure API Key
- App opens automatically
- Click "Settings" (top-right)
- Paste your Gemini API key
- Click "Save Configuration"

Get API key: https://aistudio.google.com/apikey

### 3. Start Session
- Click "Start Session"
- App will automatically capture your screen
- **Audio is captured via "loopback"** (system audio)
- Check audio meter shows green bars

---

## 🎯 Desktop App vs Browser

### Desktop App (Electron):
- ✅ Auto-starts backend
- ✅ System tray integration
- ✅ Auto screen capture
- ✅ Runs in background
- ✅ No browser needed

### Browser Version:
- ✅ Easier to debug (F12 console)
- ✅ Manual screen selection
- ✅ Better for development
- ❌ Requires manual backend start

---

## 🐛 Troubleshooting Desktop App

### App won't start
- Check if port 3001 is available
- Look for error logs in: `%APPDATA%\meeting-pilot\logs`
- Try running as Administrator

### No audio captured
- Desktop app uses "loopback" audio
- Should automatically capture system audio
- Check audio meter in video preview
- If 0.0%, check Windows audio settings

### Backend errors
- Backend starts automatically with app
- Database stored in: `%APPDATA%\meeting-pilot\meeting_pilot.db`
- Check Task Manager for node.exe process

---

## 📁 File Locations

### Development:
- Source: `Demo-repo\`
- Build output: `Demo-repo\release\`
- Backend: `Demo-repo\backend\`

### Installed App:
- Executable: `C:\Program Files\Meeting Pilot\`
- User data: `%APPDATA%\meeting-pilot\`
- Database: `%APPDATA%\meeting-pilot\meeting_pilot.db`

---

## 🔄 Rebuild After Fixes

**IMPORTANT:** The current build in `release_new\` is OLD!

To get all the audio fixes:
```bash
# 1. Build new version
build-app.bat

# 2. Run new build
release\win-unpacked\Meeting Pilot.exe
```

---

## 💡 Pro Tips

### System Tray:
- App minimizes to system tray (bottom-right)
- Right-click tray icon:
  - "Show Dashboard" - Open main window
  - "Quit Pilot" - Close app

### Overlay Mode:
- Click "HUD Overlay" button
- Shows floating transcript window
- Always on top
- Hidden from screen capture

### Auto-Start:
- App can run on Windows startup
- Stays in system tray
- Ready when you need it

---

## 🆘 Need Help?

### Desktop App Issues:
1. Check if backend is running (Task Manager → node.exe)
2. Check audio meter shows activity
3. Try browser version for debugging
4. See TROUBLESHOOTING.md

### Build Issues:
1. Make sure Node.js is installed
2. Run `npm install` first
3. Check for error messages
4. Try deleting `node_modules` and reinstalling

---

## 📊 Build vs Run

### When to BUILD:
- After code changes
- After pulling updates
- To get latest fixes
- First time setup

### When to RUN:
- Daily use
- Testing
- After successful build
- No code changes

---

## ✅ Verification

After building, verify:
- [ ] `release\win-unpacked\Meeting Pilot.exe` exists
- [ ] App starts without errors
- [ ] Backend starts automatically
- [ ] Can configure API key
- [ ] Can start session
- [ ] Audio meter shows activity
- [ ] Transcription appears

---

## 🎊 You're Ready!

Run the build script and enjoy your fixed Windows app! 🚀
