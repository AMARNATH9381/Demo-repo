
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { TranscriptEntry, ConnectionStatus, MeetingSession } from './types';
import { createPcmBlob, decode, decodeAudioData } from './services/audioUtils';
import { apiService } from './services/apiService';
import TranscriptFeed from './components/TranscriptFeed';
import HistoryModal from './components/HistoryModal';
import TranscriptOverlay from './components/TranscriptOverlay';

const MODEL_NAME_LIVE = 'gemini-2.5-flash-native-audio-preview-09-2025';
const MODEL_NAME_PRO = 'gemini-2.5-flash-lite';

const App: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [isSharing, setIsSharing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [liveAssistantResponse, setLiveAssistantResponse] = useState<{ text: string; talkingPoints: string[] } | null>(null);
  const [liveInputText, setLiveInputText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [resumeText, setResumeText] = useState<string>('');
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<MeetingSession[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const activeStreamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');
  const lastPreviewUpdateRef = useRef<number>(0);

  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  const isAiStudioEnv = () => typeof window !== 'undefined' && (window as any).aistudio;

  useEffect(() => {
    const loadData = async () => {
      try {
        const [resumeData, sessionsData] = await Promise.all([
          apiService.getResume(),
          apiService.getSessions()
        ]);
        setResumeText(resumeData.resumeText);
        setHistory(sessionsData.map(s => ({
          ...s,
          transcript: typeof s.transcript === 'string' ? JSON.parse(s.transcript) : s.transcript
        })));

        // Recover unsaved session
        const savedTranscript = localStorage.getItem('current_transcript');
        if (savedTranscript) {
          try {
            const parsed = JSON.parse(savedTranscript);
            if (parsed.length > 0) {
              setTranscript(parsed);
              // Do NOT clear localStorage here, wait for explicit stopMeeting
            }
          } catch (e) {
            console.error("Failed to recover session", e);
          }
        }

      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (resumeText) {
      apiService.saveResume(resumeText).catch(err => console.error('Failed to save resume:', err));
    }
  }, [resumeText]);

  // Prevent accidental refresh/close during meeting
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status === ConnectionStatus.CONNECTED) {
        e.preventDefault();
        e.returnValue = ''; // Trigger browser warning
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [status]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingResume(true);
    setError(null);

    try {
      if (isAiStudioEnv() && !await (window as any).aistudio.hasSelectedApiKey()) {
        await (window as any).aistudio.openSelectKey();
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (typeof event.target?.result === 'string') {
            setResumeText(event.target.result);
            setIsParsingResume(false);
          }
        };
        reader.readAsText(file);
      } else {
        const base64Data = await fileToBase64(file);
        const response = await ai.models.generateContent({
          model: MODEL_NAME_PRO,
          contents: [{
            parts: [
              { inlineData: { data: base64Data, mimeType: file.type } },
              { text: "Extract professional context from this resume into clean sections. Focus on Amarnath M's expertise in AWS, Kubernetes, and CI/CD." }
            ]
          }]
        });
        console.log('API Response:', response);
        if (response.text) {
          setResumeText(response.text);
        } else {
          console.log('No text in response');
        }
        setIsParsingResume(false);
      }
    } catch (err: any) {
      setError("Context processing failed. Ensure your API Key is valid.");
      setIsParsingResume(false);
    }
  };

  const stopMeeting = useCallback(async () => {
    // Save to history before clearing
    if (transcript.length > 0) {
      const newSession: MeetingSession = {
        id: `session_${Date.now()}`,
        date: new Date().toLocaleString(),
        title: `Meeting on ${new Date().toLocaleDateString()}`,
        transcript: [...transcript]
      };
      try {
        await apiService.saveSession(newSession);
        setHistory(prev => [newSession, ...prev]);
      } catch (err) {
        console.error('Failed to save session:', err);
      }
    }

    if (sessionRef.current) sessionRef.current.close?.();
    if (processorRef.current) processorRef.current.disconnect();
    if (audioContextRef.current) audioContextRef.current.close().catch(() => { });
    if (outputAudioContextRef.current) outputAudioContextRef.current.close().catch(() => { });
    if (activeStreamRef.current) activeStreamRef.current.getTracks().forEach(t => t.stop());

    setIsSharing(false);
    setAudioLevel(0);
    setStatus(ConnectionStatus.DISCONNECTED);
    setLiveAssistantResponse(null);
    setLiveInputText('');
    setTranscript([]); // Clear for next session
    localStorage.removeItem('current_transcript');
  }, [transcript]);

  const parseStreamingResponse = (raw: string) => {
    if (!raw) return { text: "", talkingPoints: [] };
    const answerIdx = raw.indexOf("Answer:");
    const pointsIdx = raw.indexOf("Talking Points:");
    let text = answerIdx !== -1 ? raw.substring(answerIdx + 7, pointsIdx !== -1 ? pointsIdx : raw.length).trim() : (pointsIdx === -1 ? raw.trim() : "");
    let talkingPoints = pointsIdx !== -1 ? raw.substring(pointsIdx + 15).split(/[•\n]/).map(p => p.trim()).filter(p => p.length > 5) : [];
    return { text, talkingPoints };
  };

  const startMeeting = async () => {
    try {
      setStatus(ConnectionStatus.CONNECTING);
      setError(null);

      if (isAiStudioEnv() && !await (window as any).aistudio.hasSelectedApiKey()) {
        await (window as any).aistudio.openSelectKey();
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as any,
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        } as any
      });

      if (stream.getAudioTracks().length === 0) {
        stream.getTracks().forEach(t => t.stop());
        throw new Error("System audio not detected. Ensure 'Share system audio' is selected during screen share.");
      }

      activeStreamRef.current = stream;
      setIsSharing(true);
      if (videoPreviewRef.current) videoPreviewRef.current.srcObject = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = audioCtx;
      outputAudioContextRef.current = outputAudioCtx;

      const systemInstruction = `
        You are the Gemini Meeting Pilot for Amarnath M, an AWS DevOps Engineer.
        
        IDENTITY: Senior AWS DevOps Engineer with 3.5 years of experience in EKS, Terraform, ArgoCD, and Jenkins.
        CONTEXT: ${resumeText || 'Specialist in Cloud Native Automation and CI/CD.'}
        
        PERSONA (INDIAN TECHNICAL STYLE):
        - Tone: Senior Indian Technical Architect (Pragmatic, authoritative, polite, and helpful).
        - Mannerisms: Use phrases like "Actually, from my side...", "Kindly check if we can...", "Basically, in production we follow...", "In my previous experience with EKS...", "We can surely implement this using Terraform...", "Actually, looking at the current architecture...".
        - Style: Professional Indian English. Direct on technical points but respectful in tone.

        STRICT LANGUAGE ENFORCEMENT: 
        - You must ALWAYS speak in ENGLISH. 
        - If the user or participant speaks in Hindi, Telugu, or any other language, you must MENTALLY translate it and respond ONLY in English. 
        - Do NOT switch languages under any circumstances.
        
        EXPERT DEPTH REQUIREMENTS (MANDATORY):
        For every technical question or discussion:
        1. REAL-WORLD EXAMPLES: At least 50% of your responses must include a specific real-world production scenario or example you've encountered.
        2. ARCHITECTURAL TRADE-OFFS: Explicitly mention why we chose one tool/strategy over another (e.g., EKS Fargate vs EC2 nodes, or ArgoCD vs Jenkins).
        3. POTENTIAL PITFALLS: Highlight common "gotchas" or production risks (e.g., "be careful with HPA configurations if your metrics server isn't scaled", "OOM kills in Kubernetes due to missing resource limits").
        
        TASK: Act as Amarnath's co-pilot. If a question is asked, answer professionally using his specific stack, Indian professional style, and deep technical reasoning.
        
        FORMAT:
        Answer: [The expert response including examples, trade-offs, and pitfalls]
        Talking Points:
        • [Evidence point 1 from resume]
        • [Evidence point 2 from resume]
      `;

      const sessionPromise = ai.live.connect({
        model: MODEL_NAME_LIVE,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction,
        },
        callbacks: {
          onopen: async () => {
            setStatus(ConnectionStatus.CONNECTED);
            sessionPromise.then(s => { sessionRef.current = s; });

            await audioCtx.audioWorklet.addModule('/audio-processor.js');
            const source = audioCtx.createMediaStreamSource(stream);
            const workletNode = new AudioWorkletNode(audioCtx, 'audio-processor');

            workletNode.port.onmessage = (e) => {
              const data = e.data;
              let max = 0;
              for (let i = 0; i < data.length; i++) if (Math.abs(data[i]) > max) max = Math.abs(data[i]);
              setAudioLevel(max);
              sessionPromise.then(s => s.sendRealtimeInput({ media: createPcmBlob(data) }));
            };

            source.connect(workletNode);
            workletNode.connect(audioCtx.destination);
            processorRef.current = workletNode as any;
          },
          onmessage: async (m: LiveServerMessage) => {
            const audioData = m.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              const buffer = await decodeAudioData(decode(audioData), outputAudioCtx, 24000, 1);
              const source = outputAudioCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputAudioCtx.destination);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioCtx.currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (m.serverContent?.outputTranscription) {
              currentOutputTranscriptionRef.current += m.serverContent.outputTranscription.text;
              if (Date.now() - lastPreviewUpdateRef.current > 100) {
                setLiveAssistantResponse(parseStreamingResponse(currentOutputTranscriptionRef.current));
                lastPreviewUpdateRef.current = Date.now();
              }
            } else if (m.serverContent?.inputTranscription) {
              currentInputTranscriptionRef.current += m.serverContent.inputTranscription.text;
              setLiveInputText(currentInputTranscriptionRef.current);
            }

            if (m.serverContent?.turnComplete) {
              const uText = currentInputTranscriptionRef.current.trim();
              const finalParsed = parseStreamingResponse(currentOutputTranscriptionRef.current);

              if (uText || finalParsed.text) {
                const newEntries: TranscriptEntry[] = [
                  ...(uText ? [{ id: `u_${Date.now()}`, speaker: 'Participant' as const, text: uText, timestamp: new Date().toLocaleTimeString(), isFinal: true }] : []),
                  ...(finalParsed.text ? [{ id: `a_${Date.now()}`, speaker: 'Assistant' as const, text: finalParsed.text, talkingPoints: finalParsed.talkingPoints, timestamp: new Date().toLocaleTimeString(), isFinal: true }] : [])
                ];

                setTranscript(prev => {
                  const updated = [...prev, ...newEntries];
                  localStorage.setItem('current_transcript', JSON.stringify(updated)); // Auto-save to local storage
                  return updated;
                });
              }
              currentInputTranscriptionRef.current = '';
              currentOutputTranscriptionRef.current = '';
              setLiveAssistantResponse(null);
              setLiveInputText('');
            }

            if (m.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) { } });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setLiveAssistantResponse(null);
              setLiveInputText('');
            }
          },
          onerror: (e: any) => {
            console.error("Gemini Live Error:", e);
            setError("Connection Error. Please ensure you have selected a valid Gemini API key.");
            stopMeeting();
          },
          onclose: () => stopMeeting(),
        },
      });
    } catch (err: any) {
      setError(err.message || "Failed to initialize meeting session.");
      stopMeeting();
    }
  };

  const deleteSession = async (id: string) => {
    try {
      await apiService.deleteSession(id);
      setHistory(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const clearAllHistory = async () => {
    try {
      await apiService.clearAllSessions();
      setHistory([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const togglePiP = async () => {
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
      return;
    }

    try {
      // Check if Document Picture-in-Picture API is available
      if ('documentPictureInPicture' in window) {
        const pip = await (window as any).documentPictureInPicture.requestWindow({
          width: 400,
          height: 600,
        });

        // Copy styles
        [...document.styleSheets].forEach((styleSheet) => {
          try {
            const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
            const style = document.createElement('style');
            style.textContent = cssRules;
            pip.document.head.appendChild(style);
          } catch (e) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = styleSheet.type;
            link.media = styleSheet.media;
            link.href = styleSheet.href!;
            pip.document.head.appendChild(link);
          }
        });

        // Add base styles specifically for the PiP window to ensure glassmorphism works
        const baseStyle = document.createElement('style');
        baseStyle.textContent = `
          html, body { 
            margin: 0; 
            padding: 0;
            height: 100%;
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            color: #cbd5e1; 
            font-family: ui-sans-serif, system-ui, sans-serif;
            overflow: hidden;
          }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
          ::-webkit-scrollbar-thumb:hover { background: #64748b; }
        `;
        pip.document.head.appendChild(baseStyle);

        pip.addEventListener('pagehide', () => {
          setPipWindow(null);
        });

        setPipWindow(pip);
      } else {
        alert("Your browser doesn't support the Document Picture-in-Picture API. Please use Chrome or Edge 111+.");
      }
    } catch (err) {
      console.error("Failed to open PiP window:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans flex flex-col">
      <nav className="h-16 border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl flex-none z-40 flex items-center justify-between px-8">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
          <span className="text-xs font-black uppercase tracking-[0.2em]">Meeting Pilot</span>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>History</span>
          </button>

          <button
            onClick={togglePiP}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${pipWindow
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" className="hidden" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H10a2 2 0 01-2-2v-2zM4 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
              {/* Using a simple stack/window icon for PiP */}
              <rect x="14" y="14" width="8" height="8" rx="2" strokeWidth="2" fill="none" />
              <path d="M4 10H14" strokeWidth="2" strokeLinecap="round" />
              <path d="M4 6H14" strokeWidth="2" strokeLinecap="round" />
              <path d="M4 14H10" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>HUD Overlay</span>
          </button>

          {isSharing && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Active Pilot</span>
            </div>
          )}
          <button
            onClick={status === ConnectionStatus.CONNECTED ? stopMeeting : startMeeting}
            className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${status === ConnectionStatus.CONNECTED
              ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-600 hover:text-white'
              : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)]'
              }`}
          >
            {status === ConnectionStatus.CONNECTED ? 'Stop Monitoring' : 'Start Session'}
          </button>
        </div>
      </nav>

      <main className="max-w-[1400px] w-full mx-auto p-8 grid grid-cols-12 gap-8 flex-1 overflow-hidden">
        <div className="col-span-4 flex flex-col space-y-6 h-full min-h-0">
          <div className="bg-slate-900/40 rounded-2xl border border-white/5 p-6 flex flex-col space-y-4 shadow-xl min-h-0">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Amarnath M Context</h2>
              <label className="cursor-pointer text-[10px] font-bold text-indigo-400 hover:text-indigo-300">
                {isParsingResume ? 'Processing...' : 'Upload Resume'}
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={isParsingResume} />
              </label>
            </div>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste professional background here..."
              className="flex-1 bg-slate-950/40 border border-white/5 rounded-xl p-4 text-xs text-slate-400 focus:outline-none resize-none custom-scrollbar leading-relaxed"
            />
          </div>
          <div className="h-48 flex-none bg-slate-900/40 rounded-2xl border border-white/5 overflow-hidden relative shadow-inner">
            <video ref={videoPreviewRef} autoPlay muted playsInline className={`w-full h-full object-cover ${isSharing ? 'opacity-40' : 'opacity-0'}`} />
            {!isSharing && <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase tracking-[0.3em] opacity-20">Monitoring Off</div>}
          </div>
        </div>
        <div className="col-span-8 flex flex-col h-full min-h-0">
          <TranscriptFeed transcript={transcript} currentLiveAssistantResponse={liveAssistantResponse} currentLiveInputText={liveInputText} />
        </div>
      </main>

      {showHistory && (
        <HistoryModal
          history={history}
          onClose={() => setShowHistory(false)}
          onDelete={deleteSession}
          onClearAll={clearAllHistory}
        />
      )}

      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-950 border border-red-500/50 text-white px-8 py-4 rounded-2xl text-[11px] font-bold shadow-2xl flex items-center space-x-6 z-50">
          <div className="flex items-center space-x-2 text-red-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span className="uppercase tracking-widest font-black">System Alert</span>
          </div>
          <span className="text-slate-300">{error}</span>
          <button onClick={() => setError(null)} className="uppercase text-[10px] font-black text-slate-500 hover:text-white">Dismiss</button>
        </div>
      )}

      {pipWindow && createPortal(
        <TranscriptOverlay
          transcript={transcript}
          liveAssistantResponse={liveAssistantResponse}
          liveInputText={liveInputText}
        />,
        pipWindow.document.body
      )}
    </div>
  );
};

export default App;
