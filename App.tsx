import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { TranscriptEntry, ConnectionStatus, MeetingSession } from './types';
import { createPcmBlob, decode, decodeAudioData } from './services/audioUtils';
import { apiService } from './services/apiService';
import TranscriptFeed from './components/TranscriptFeed';
import HistoryModal from './components/HistoryModal';
import TranscriptOverlay from './components/TranscriptOverlay';

const MODEL_NAME_LIVE = 'gemini-2.5-flash-native-audio-preview-12-2025';
const MODEL_NAME_PRO = 'gemini-2.5-flash';

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

  // Dynamic API Key State
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 3;

  // Session timer state
  const [sessionElapsed, setSessionElapsed] = useState(0); // in seconds
  const sessionStartTimeRef = useRef<number | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);

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
  const lastInputTimeRef = useRef<number>(0);
  const lastPreviewUpdateRef = useRef<number>(0);


  const [pickerSources, setPickerSources] = useState<any[]>([]);

  // Electron IPC for Screen Picker
  useEffect(() => {
    if ((window as any).require) {
      const { ipcRenderer } = (window as any).require('electron');
      ipcRenderer.on('show-screen-picker', (_event: any, sources: any[]) => {
        setPickerSources(sources);
      });
      return () => {
        ipcRenderer.removeAllListeners('show-screen-picker');
      };
    }
  }, []);

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

      if (!apiKey) {
        setShowSettings(true);
        setError("Please configure your Gemini API Key in Settings.");
        setIsParsingResume(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
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

    // Clear session timer
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    sessionStartTimeRef.current = null;
    setSessionElapsed(0);

    setIsSharing(false);
    setAudioLevel(0);
    setStatus(ConnectionStatus.DISCONNECTED);
    setLiveAssistantResponse(null);
    setLiveInputText('');
    setTranscript([]); // Clear for next session
    localStorage.removeItem('current_transcript');
  }, [transcript]);



  const startMeeting = useCallback(async () => {
    try {
      setStatus(ConnectionStatus.CONNECTING);
      setError(null);

      if (isAiStudioEnv() && !await (window as any).aistudio.hasSelectedApiKey()) {
        await (window as any).aistudio.openSelectKey();
      }

      // Reuse existing stream if available (for auto-reconnect)
      let stream = activeStreamRef.current;

      // Check if existing stream is still active
      const streamActive = stream && stream.active && stream.getTracks().some(t => t.readyState === 'live');

      if (!streamActive) {
        // Need to get a new stream
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always" } as any,
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          } as any
        });

        if (stream.getAudioTracks().length === 0) {
          stream.getTracks().forEach(t => t.stop());
          throw new Error("System audio not detected. Please select 'Same as System' audio or check 'Share Tab Audio' in the browser dialog.");
        }

        activeStreamRef.current = stream;
        if (videoPreviewRef.current) videoPreviewRef.current.srcObject = stream;
      }

      setIsSharing(true);

      if (!apiKey) {
        setShowSettings(true);
        setError("Please configure your Gemini API Key in Settings.");
        setStatus(ConnectionStatus.DISCONNECTED);
        return;
      }

      const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 48000 });
      const outputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = audioCtx;
      outputAudioContextRef.current = outputAudioCtx;

      const systemInstruction = `
You are Amarnath M, a DevOps Engineer (3.5 YOE) in a job interview. You are the CANDIDATE, not an assistant.

### RESPONSE RULES
- Keep answers SHORT (1-2 sentences max) for faster responses
- Answer immediately, don't overthink
- For code requests, provide code blocks with minimal explanation
- Use natural speech: "So basically...", "In my experience...", "right?"
- If you don't understand, say "Could you clarify that?"

### YOUR TECH STACK
AWS (EC2, S3, VPC, Route53, Load Balancers), Terraform, Docker, Kubernetes, Jenkins, ArgoCD, Prometheus, Grafana, EFK Stack, SonarQube, Git, ServiceNow

### RESUME CONTEXT
${resumeText}

### EXAMPLE RESPONSES
Q: "Explain CI/CD at Capgemini."
A: "So we used Jenkins pipelines with Docker, pushed images to ECR, and deployed to EKS using ArgoCD for GitOps. Pretty standard DevOps workflow."

Q: "What tools do you use?"
A: "Mainly Kubernetes, Docker, Jenkins for CI/CD, Terraform for IaC, and AWS services like EC2, S3, VPC. Also monitoring with Prometheus and Grafana."
      `;

      console.log('[GEMINI] Attempting to connect with:');
      console.log('[GEMINI] - Model:', MODEL_NAME_LIVE);
      console.log('[GEMINI] - API Key length:', apiKey ? apiKey.length : 0);
      console.log('[GEMINI] - API Key prefix:', apiKey ? apiKey.substring(0, 10) + '...' : 'NONE');

      const sessionPromise = ai.live.connect({
        model: MODEL_NAME_LIVE,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: { parts: [{ text: systemInstruction }] },
          maxOutputTokens: 200,
        },
        callbacks: {
          onopen: async () => {
            setStatus(ConnectionStatus.CONNECTED);
            setError(null);
            reconnectAttemptsRef.current = 0;
            setIsReconnecting(false);

            if (!sessionTimerRef.current) {
              sessionStartTimeRef.current = Date.now();
              setSessionElapsed(0);
              sessionTimerRef.current = setInterval(() => {
                if (sessionStartTimeRef.current) {
                  setSessionElapsed(Math.floor((Date.now() - sessionStartTimeRef.current) / 1000));
                }
              }, 1000);
            }

            sessionPromise.then(s => { sessionRef.current = s; });

            await audioCtx.audioWorklet.addModule('audio-processor.js');
            const source = audioCtx.createMediaStreamSource(stream);
            const workletNode = new AudioWorkletNode(audioCtx, 'audio-processor');

            workletNode.port.onmessage = (e) => {
              if (sourcesRef.current.size > 0) return;

              const data = e.data;
              let max = 0;
              for (let i = 0; i < data.length; i++) if (Math.abs(data[i]) > max) max = Math.abs(data[i]);

              // NOISE GATE: Lowered to 0.001 for system audio
              if (max < 0.001) return;

              setAudioLevel(max);
              sessionPromise.then(s => s.sendRealtimeInput({ media: createPcmBlob(data) }));
            };

            source.connect(workletNode);
            workletNode.connect(audioCtx.destination);
            processorRef.current = workletNode as any;
          },
          onmessage: async (m: LiveServerMessage) => {
            if (Object.keys(m.serverContent || {}).length > 0) {
              console.log("RX:", JSON.stringify(m.serverContent));
            }
            let textData = m.serverContent?.modelTurn?.parts?.[0]?.text;

            // FILTER: Strip "Thought" blocks
            if (textData) {
              textData = textData.replace(/^\*\*.*?\*\*\n\n.*?(\n\n|$)/s, '');
              if (textData.match(/^\*\*.*?\*\*$/)) textData = '';
              if (textData.startsWith("I'm thinking") || textData.startsWith("I am formulating")) textData = '';
            }

            if (textData) {
              if (currentOutputTranscriptionRef.current === '') {
                const latency = Date.now() - (lastInputTimeRef.current || Date.now());
                console.log(`[Latency] Time to First Token: ${latency}ms`);
              }

              currentOutputTranscriptionRef.current += textData;
              setLiveAssistantResponse({ text: currentOutputTranscriptionRef.current, talkingPoints: [] });
            }

            if (m.serverContent?.outputTranscription) {
              let transText = m.serverContent.outputTranscription.text;
              currentOutputTranscriptionRef.current += transText;
              setLiveAssistantResponse({ text: currentOutputTranscriptionRef.current, talkingPoints: [] });
            } else if (m.serverContent?.inputTranscription) {
              currentInputTranscriptionRef.current += m.serverContent.inputTranscription.text;
              setLiveInputText(currentInputTranscriptionRef.current);
              lastInputTimeRef.current = Date.now();
            }

            if (m.serverContent?.turnComplete) {
              const uText = currentInputTranscriptionRef.current.trim();
              const aText = currentOutputTranscriptionRef.current.trim();

              lastInputTimeRef.current = 0;

              if (uText || aText) {
                const newEntries: TranscriptEntry[] = [
                  ...(uText ? [{ id: `u_${Date.now()}`, speaker: 'Participant' as const, text: uText, timestamp: new Date().toLocaleTimeString(), isFinal: true }] : []),
                  ...(aText ? [{ id: `a_${Date.now()}`, speaker: 'Assistant' as const, text: aText, talkingPoints: [], timestamp: new Date().toLocaleTimeString(), isFinal: true }] : [])
                ];

                setTranscript(prev => {
                  const updated = [...prev, ...newEntries];
                  localStorage.setItem('current_transcript', JSON.stringify(updated));
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
              lastInputTimeRef.current = 0;

              const partialText = currentOutputTranscriptionRef.current;
              // Only save if significant length (>50 chars)
              if (partialText && partialText.length > 50) {
                const newEntries: TranscriptEntry[] = [
                  { id: `a_part_${Date.now()}`, speaker: 'Assistant' as const, text: partialText + " (Interrupted)", talkingPoints: [], timestamp: new Date().toLocaleTimeString(), isFinal: true }
                ];
                setTranscript(prev => {
                  const updated = [...prev, ...newEntries];
                  localStorage.setItem('current_transcript', JSON.stringify(updated));
                  return updated;
                });
              }

              setLiveAssistantResponse(null);
              setLiveInputText('');
              currentOutputTranscriptionRef.current = '';
            }
          },
          onerror: (e: any) => {
            console.error("Gemini Live Error:", e);
            const errorMsg = e.message || JSON.stringify(e) || "Unknown Connection Error";
            setError(`Connection Failed: ${errorMsg}. (Check console for details)`);
            setStatus(ConnectionStatus.DISCONNECTED);
          },
          onclose: (e: any) => {
            console.log("Gemini session closed", e);
            const reason = e.reason ? `Reason: ${e.reason}` : '';
            const code = e.code ? `Code: ${e.code}` : '';

            // Clean close vs unexpected
            if (e.code === 1000) {
              setStatus(ConnectionStatus.DISCONNECTED);
              setError(null);
            } else {
              setStatus(ConnectionStatus.DISCONNECTED);
              setError(`Session Ended Unexpectedly. ${code} ${reason} (Model: ${MODEL_NAME_LIVE})`);
            }
          },
        },
      });
    } catch (err: any) {
      setError(err.message || "Failed to initialize meeting session.");
      stopMeeting();
    }
  }, [apiKey, resumeText, stopMeeting]);

  // Listen for overlay commands (start/stop session from overlay window)
  useEffect(() => {
    try {
      // @ts-ignore
      const { ipcRenderer } = window.require('electron');
      const handleOverlayCommand = (event: any, data: { action: string }) => {
        if (data.action === 'start') {
          startMeeting();
        } else if (data.action === 'stop') {
          stopMeeting();
        }
      };
      ipcRenderer.on('overlay-command', handleOverlayCommand);
      return () => {
        ipcRenderer.removeListener('overlay-command', handleOverlayCommand);
      };
    } catch (e) {
      // Not in Electron
    }
  }, [startMeeting, stopMeeting]);

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

  // Sync data with overlay
  useEffect(() => {
    try {
      // @ts-ignore
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('update-overlay-data', {
        transcript,
        liveAssistantResponse,
        liveInputText,
        status,
        error,
        sessionElapsed
      });
    } catch (e) {
      // Not in electron
    }
  }, [transcript, liveAssistantResponse, liveInputText, sessionElapsed, status, error]);

  const togglePiP = () => {
    try {
      // @ts-ignore
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('toggle-overlay');
    } catch (e) {
      console.error("Overlay not supported outside Electron context");
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-[#020617] text-slate-100 font-sans flex flex-col">
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
            onClick={() => {
              setTempApiKey(apiKey);
              setShowSettings(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Settings</span>
          </button>

          <button
            onClick={togglePiP}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-all"
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



          {isReconnecting && (
            <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 rounded-full flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Reconnecting...</span>
            </div>
          )}
          {status === ConnectionStatus.CONNECTED && sessionElapsed > 0 && (
            <div className={`px-4 py-1.5 rounded-full flex items-center space-x-2 ${sessionElapsed >= 840 ? 'bg-red-500/10 border border-red-500/20' :
              sessionElapsed >= 720 ? 'bg-amber-500/10 border border-amber-500/20' :
                'bg-slate-500/10 border border-slate-500/20'
              }`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className={`text-[10px] font-black uppercase tracking-widest ${sessionElapsed >= 840 ? 'text-red-400' :
                sessionElapsed >= 720 ? 'text-amber-400' :
                  'text-slate-400'
                }`}>
                {Math.floor(sessionElapsed / 60).toString().padStart(2, '0')}:{(sessionElapsed % 60).toString().padStart(2, '0')}
                {sessionElapsed >= 720 && ' ⚠️'}
              </span>
            </div>
          )}
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

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Application Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Gemini API Key</label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showApiKey ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-slate-500">
                  Your API key is stored locally in your browser and used directly to communicate with Google's servers.
                </p>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setApiKey(tempApiKey);
                    localStorage.setItem('gemini_api_key', tempApiKey);
                    setShowSettings(false);
                    setError(null);
                  }}
                  className="px-6 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
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



      {/* Screen Picker Modal */}
      {pickerSources.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-8 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-4xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Choose what to share</h3>
              <button
                onClick={() => {
                  const { ipcRenderer } = window.require('electron');
                  ipcRenderer.send('screen-picker-selected', null);
                  setPickerSources([]);
                }}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 grid grid-cols-3 gap-4 p-2">
              {pickerSources.map((source: any) => (
                <button
                  key={source.id}
                  onClick={() => {
                    const { ipcRenderer } = window.require('electron');
                    ipcRenderer.send('screen-picker-selected', source.id);
                    setPickerSources([]);
                  }}
                  className="group flex flex-col space-y-3 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-left"
                >
                  <div className="aspect-video bg-black rounded-lg overflow-hidden border border-white/5 relative group-hover:border-indigo-500/50 transition-all">
                    <img src={source.thumbnail.toDataURL()} alt={source.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs font-medium text-slate-300 group-hover:text-white truncate w-full block">{source.name}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  const { ipcRenderer } = window.require('electron');
                  ipcRenderer.send('screen-picker-selected', null);
                  setPickerSources([]);
                }}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
