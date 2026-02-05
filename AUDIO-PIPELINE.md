# Audio Processing Pipeline

## 🔊 How Audio Flows Through the System

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER ACTIONS                                 │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │  Click "Start Session"  │
                    └─────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │  Browser Dialog Appears │
                    │  ✅ CHECK "Share Audio" │ ◄── CRITICAL STEP!
                    └─────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      AUDIO CAPTURE LAYER                             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────────────────┐
                    │  getDisplayMedia()      │
                    │  - video: cursor        │
                    │  - audio: 48kHz         │ ◄── FIXED: Was 16kHz
                    └─────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │  MediaStream Created    │
                    │  - Video Track          │
                    │  - Audio Track (48kHz)  │
                    └─────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
        ┌───────────────────┐       ┌───────────────────┐
        │  Video Preview    │       │  Audio Processing │
        │  (srcObject)      │       │  Pipeline         │
        └───────────────────┘       └───────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AUDIO PROCESSING LAYER                            │
└─────────────────────────────────────────────────────────────────────┘
                                              │
                    ┌─────────────────────────┐
                    │  AudioContext (48kHz)   │ ◄── FIXED: Was 16kHz
                    │  createMediaStreamSource│
                    └─────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │  AudioWorkletNode       │
                    │  "audio-processor"      │
                    └─────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │  Downsample             │
                    │  48kHz → 16kHz (3:1)    │ ◄── NEW: Added downsampling
                    │  Buffer: 2048 samples   │ ◄── FIXED: Was 512
                    └─────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │  Calculate Audio Level  │
                    │  max = |sample|         │
                    └─────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │  Noise Gate Filter      │
                    │  if (max < 0.001) skip  │ ◄── FIXED: Was 0.01
                    └─────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │  Convert to PCM         │
                    │  Float32 → Int16        │
                    │  Base64 encode          │
                    └─────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         UI UPDATE LAYER                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────────────────┐
                    │  Update Audio Meter     │
                    │  Green bar: 0-100%      │ ◄── NEW: Visual feedback
                    │  Warning if < 0.1%      │
                    └─────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      GEMINI API LAYER                                │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────────────────┐
                    │  session.sendRealtimeInput│
                    │  { media: PCM blob }    │
                    └─────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │  Gemini Live API        │
                    │  Model: gemini-2.5-flash│
                    │  Input: 16kHz PCM       │
                    └─────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
        ┌───────────────────┐       ┌───────────────────┐
        │  Input            │       │  Output           │
        │  Transcription    │       │  Transcription    │
        │  (Speech-to-Text) │       │  (Assistant Voice)│
        └───────────────────┘       └───────────────────┘
                    │                           │
                    └─────────────┬─────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DISPLAY LAYER                                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────────────────┐
                    │  TranscriptFeed         │
                    │  - Captured Audio       │
                    │  - Assistant Response   │
                    └─────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │  User Sees Transcription│
                    │  ✅ SUCCESS!            │
                    └─────────────────────────┘
```

---

## 🔍 Key Points in the Pipeline

### 1. Audio Capture (Lines 207-226, App.tsx)
```javascript
stream = await navigator.mediaDevices.getDisplayMedia({
  audio: { sampleRate: 48000 }  // ✅ Native system audio rate
});
```

### 2. Audio Context (Line 237, App.tsx)
```javascript
const audioCtx = new AudioContext({ sampleRate: 48000 });  // ✅ Match input
```

### 3. Downsampling (audio-processor.js)
```javascript
downsample(input) {
  const ratio = 3;  // 48kHz / 16kHz = 3
  for (let i = 0; i < outputLength; i++) {
    output[i] = input[i * ratio];  // Take every 3rd sample
  }
}
```

### 4. Noise Gate (Line 298, App.tsx)
```javascript
if (max < 0.001) return;  // ✅ Low threshold for system audio
```

### 5. Visual Feedback (Lines 680-700, App.tsx)
```javascript
<div className="meter">
  <div style={{ width: `${audioLevel * 100}%` }} />  // ✅ Real-time meter
</div>
```

---

## 🚨 Common Failure Points

### ❌ Point 1: Browser Dialog
**Problem:** User doesn't check "Share audio"
**Result:** Audio track exists but no data
**Fix:** Restart and CHECK the audio option

### ❌ Point 2: Sample Rate Mismatch
**Problem:** AudioContext at 16kHz, input at 48kHz
**Result:** Audio quality degradation
**Fix:** Match AudioContext to input (48kHz)

### ❌ Point 3: Noise Gate Too High
**Problem:** Threshold 0.01 blocks quiet system audio
**Result:** Audio captured but filtered out
**Fix:** Lower to 0.001

### ❌ Point 4: No Downsampling
**Problem:** Sending 48kHz to Gemini (expects 16kHz)
**Result:** Transcription fails or poor quality
**Fix:** Downsample 48kHz → 16kHz before sending

### ❌ Point 5: No Visual Feedback
**Problem:** User can't tell if audio is working
**Result:** Confusion and debugging difficulty
**Fix:** Add audio level meter

---

## 📊 Data Flow Example

### Input: YouTube Video Playing
```
YouTube Audio (48kHz, stereo)
  ↓
Browser captures at 48kHz
  ↓
AudioContext processes at 48kHz
  ↓
AudioWorklet downsamples to 16kHz
  ↓
Calculate level: 0.234 (23.4%)
  ↓
Pass noise gate (> 0.001) ✅
  ↓
Convert to PCM Int16
  ↓
Base64 encode
  ↓
Send to Gemini API
  ↓
Receive transcription: "Welcome to this video..."
  ↓
Display in UI
```

### Timing:
- Audio chunk: 32ms (512 samples at 16kHz)
- Network latency: 50-100ms
- Gemini processing: 500-1000ms
- **Total: 1-2 seconds** ✅

---

## 🎯 Optimization Points

### Current Performance:
- ✅ Low latency (1-2s)
- ✅ Continuous streaming
- ✅ Real-time feedback
- ✅ Efficient downsampling

### Potential Improvements:
- 🔄 Adaptive noise gate (auto-adjust)
- 🔄 Audio compression (reduce bandwidth)
- 🔄 Local VAD (Voice Activity Detection)
- 🔄 Multi-channel support (stereo → mono)

---

## 🧪 Testing Each Stage

### Stage 1: Capture
```javascript
// Check if audio track exists
stream.getAudioTracks().length > 0  // Should be true
```

### Stage 2: Context
```javascript
// Check audio context state
audioContext.state === 'running'  // Should be true
```

### Stage 3: Processing
```javascript
// Check audio level
audioLevel > 0.001  // Should be true when audio plays
```

### Stage 4: Sending
```javascript
// Check console for
"[AUDIO] Sending chunk, level: 0.0234"  // Should appear
```

### Stage 5: Receiving
```javascript
// Check for transcription
currentLiveInputText.length > 0  // Should be true after 1-2s
```

---

## 📝 Summary

**Before Fixes:**
- ❌ Sample rate mismatch
- ❌ No downsampling
- ❌ Noise gate too high
- ❌ No visual feedback
- ❌ Poor audio quality

**After Fixes:**
- ✅ Correct sample rates
- ✅ Proper downsampling
- ✅ Appropriate noise gate
- ✅ Real-time audio meter
- ✅ High-quality transcription

**Result:** System audio capture and transcription now working reliably! 🎉
