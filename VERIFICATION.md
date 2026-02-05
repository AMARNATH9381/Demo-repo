# ✅ Verification Checklist

Use this checklist to verify all fixes are working correctly.

---

## 📋 Pre-Test Setup

### Dependencies Installed
- [ ] Frontend dependencies: `npm install` (in root)
- [ ] Backend dependencies: `cd backend && npm install`
- [ ] No error messages during installation

### API Key Configured
- [ ] Obtained from https://aistudio.google.com/apikey
- [ ] Starts with "AIzaSy..."
- [ ] Saved in app Settings

### Servers Running
- [ ] Backend: `cd backend && npm start`
- [ ] Shows: "Server running on port 3001"
- [ ] Frontend: `npm run dev` (or use `start-app.bat`)
- [ ] Shows: "Local: http://localhost:3000"

---

## 🧪 Test 1: Backend Connectivity

### Steps:
1. Open browser console (F12)
2. Paste and run:
```javascript
fetch('http://localhost:3001/api/resume')
  .then(r => r.json())
  .then(d => console.log('✅ Backend OK:', d))
  .catch(e => console.error('❌ Backend Error:', e));
```

### Expected Result:
- [ ] Console shows: `✅ Backend OK: {resumeText: ""}`
- [ ] No CORS errors
- [ ] No connection refused errors

### If Failed:
- Check backend is running on port 3001
- Check no other app is using port 3001
- Restart backend server

---

## 🧪 Test 2: Audio Capture (Standalone)

### Steps:
1. Open `audio-test.html` in browser
2. Click "Start Audio Capture"
3. Select a tab/window
4. **✅ CHECK "Share tab audio"**
5. Click "Share"
6. Play audio (YouTube, music, etc.)

### Expected Result:
- [ ] Video preview shows selected content
- [ ] Audio meter shows green bars
- [ ] Percentage > 0.1% when audio plays
- [ ] Console logs: "Audio detected: X.XX%"
- [ ] Track info shows: sampleRate: 48000

### If Failed:
- You didn't check "Share audio" in dialog
- No audio is actually playing
- Browser doesn't support audio capture
- Try Chrome/Edge instead of Firefox

---

## 🧪 Test 3: Full App - Audio Capture

### Steps:
1. Open http://localhost:3000
2. Click "Start Session"
3. Select tab/window
4. **✅ CHECK "Share tab audio"**
5. Click "Share"

### Expected Result:
- [ ] Status changes to "Active Pilot" (green)
- [ ] Video preview shows selected content
- [ ] Audio level meter appears (bottom-left)
- [ ] Meter shows green bars when audio plays
- [ ] Console shows: `[AUDIO] Track settings: {sampleRate: 48000}`
- [ ] Console shows: `[AUDIO] Track enabled: true`
- [ ] Console shows: `[AUDIO] Track muted: false`

### If Failed:
- Check "Share audio" was selected
- Check system volume is not muted
- Check audio is actually playing in shared source
- Try sharing a different tab/window

---

## 🧪 Test 4: Audio Processing

### Steps:
1. With session active (from Test 3)
2. Play audio or speak
3. Watch console (F12)

### Expected Result:
- [ ] Console shows: `[AUDIO] Sending chunk, level: 0.XXXX`
- [ ] Level value changes with audio volume
- [ ] Messages appear continuously (every ~32ms)
- [ ] Audio meter percentage matches console level

### If Failed:
- Audio level at 0.0% → No audio being captured
- No console messages → Audio worklet not running
- Check browser console for errors
- Restart session

---

## 🧪 Test 5: Transcription Display

### Steps:
1. With session active and audio flowing
2. Speak clearly or play video with speech
3. Wait 2-3 seconds

### Expected Result:
- [ ] "Captured Audio" section appears
- [ ] Shows transcribed text
- [ ] Text updates in real-time
- [ ] Text matches spoken words
- [ ] No "Generating response..." stuck message

### If Failed:
- Check API key is valid
- Check internet connection
- Check console for Gemini API errors
- Try speaking louder/clearer
- Wait up to 5 seconds (first transcription can be slow)

---

## 🧪 Test 6: Assistant Response

### Steps:
1. With transcription working
2. Ask a question: "What is DevOps?"
3. Wait 2-4 seconds

### Expected Result:
- [ ] "Assistant" section appears
- [ ] Shows response text
- [ ] Response is relevant to question
- [ ] Response follows system instructions (concise)
- [ ] No error messages

### If Failed:
- Check API key has quota remaining
- Check Gemini API status
- Try a simpler question
- Check console for errors

---

## 🧪 Test 7: Visual Feedback

### Steps:
1. With session active
2. Observe UI elements

### Expected Result:
- [ ] Audio meter visible in video preview
- [ ] Meter shows percentage (0.0% - 100.0%)
- [ ] Green bar width matches percentage
- [ ] Warning appears if audio < 0.1%
- [ ] Session timer shows elapsed time
- [ ] "Active Pilot" indicator visible

### If Failed:
- Refresh page
- Check CSS is loading
- Check no browser extensions blocking UI

---

## 🧪 Test 8: Session Management

### Steps:
1. Start session
2. Transcribe some audio
3. Click "Stop Monitoring"
4. Click "History"

### Expected Result:
- [ ] Session stops cleanly
- [ ] Transcript saved to history
- [ ] History modal shows saved session
- [ ] Can view past transcripts
- [ ] Can delete sessions

### If Failed:
- Check backend is running
- Check database file exists (backend/meeting_pilot.db)
- Check console for API errors

---

## 🧪 Test 9: Error Handling

### Steps:
1. Start session with invalid API key
2. Start session without audio enabled
3. Stop backend while session active

### Expected Result:
- [ ] Invalid key: Shows error message
- [ ] No audio: Shows "System audio not detected"
- [ ] Backend down: Shows connection error
- [ ] Errors are dismissible
- [ ] App doesn't crash

### If Failed:
- Check error handling code
- Check console for unhandled exceptions

---

## 🧪 Test 10: Performance

### Steps:
1. Start session
2. Run for 5 minutes
3. Monitor performance

### Expected Result:
- [ ] No memory leaks (check Task Manager)
- [ ] CPU usage < 20%
- [ ] Audio stays synchronized
- [ ] No lag in transcription
- [ ] No browser freezing

### If Failed:
- Close other tabs/apps
- Check for console errors
- Restart browser

---

## 📊 Success Criteria

### All Tests Passed ✅
- Backend connectivity: ✅
- Audio capture: ✅
- Audio processing: ✅
- Transcription: ✅
- Assistant response: ✅
- Visual feedback: ✅
- Session management: ✅
- Error handling: ✅
- Performance: ✅

### Ready for Use! 🎉

---

## 🐛 Common Issues Found During Testing

### Issue: Audio meter at 0.0%
**Cause:** Audio not enabled in browser dialog
**Fix:** Restart session, CHECK "Share audio"

### Issue: No transcription after 5+ seconds
**Cause:** API key invalid or rate limited
**Fix:** Check API key, wait 1 minute, try again

### Issue: "Backend Error" in console
**Cause:** Backend not running
**Fix:** `cd backend && npm start`

### Issue: Choppy audio/transcription
**Cause:** Poor internet connection
**Fix:** Check network, close bandwidth-heavy apps

### Issue: Browser freezing
**Cause:** Too many tabs open
**Fix:** Close unused tabs, restart browser

---

## 📝 Test Results Template

Copy and fill out:

```
Date: ___________
Browser: ___________
OS: ___________

Test 1 (Backend): [ ] Pass [ ] Fail
Test 2 (Audio Capture): [ ] Pass [ ] Fail
Test 3 (App Audio): [ ] Pass [ ] Fail
Test 4 (Processing): [ ] Pass [ ] Fail
Test 5 (Transcription): [ ] Pass [ ] Fail
Test 6 (Assistant): [ ] Pass [ ] Fail
Test 7 (Visual): [ ] Pass [ ] Fail
Test 8 (Session): [ ] Pass [ ] Fail
Test 9 (Errors): [ ] Pass [ ] Fail
Test 10 (Performance): [ ] Pass [ ] Fail

Notes:
_________________________________
_________________________________
_________________________________
```

---

## 🎯 Next Steps After Verification

### If All Tests Pass:
1. ✅ App is ready to use
2. ✅ Share with team/users
3. ✅ Monitor for issues
4. ✅ Collect feedback

### If Some Tests Fail:
1. 🔍 Check TROUBLESHOOTING.md
2. 🔍 Review AUDIO-PIPELINE.md
3. 🔍 Check console errors
4. 🔍 Try different browser
5. 🔍 Restart everything

### If All Tests Fail:
1. 🆘 Verify Node.js installed
2. 🆘 Verify npm install completed
3. 🆘 Verify ports 3000/3001 available
4. 🆘 Check firewall/antivirus
5. 🆘 Try on different machine

---

## 📞 Support

If verification fails after trying all fixes:
1. Collect test results (use template above)
2. Copy console errors
3. Note browser/OS versions
4. Check TROUBLESHOOTING.md
5. Review IMPROVEMENTS.md for technical details
