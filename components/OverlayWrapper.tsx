import React, { useEffect, useState } from 'react';
import TranscriptOverlay from './TranscriptOverlay';
import { TranscriptEntry } from '../types';

const OverlayWrapper: React.FC = () => {
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [liveAssistantResponse, setLiveAssistantResponse] = useState<{ text: string; talkingPoints: string[] } | null>(null);
    const [liveInputText, setLiveInputText] = useState<string>('');
    const [status, setStatus] = useState<string>('DISCONNECTED');
    const [error, setError] = useState<string | null>(null);
    const [sessionElapsed, setSessionElapsed] = useState<number>(0);

    useEffect(() => {
        let ipcRenderer: any;
        try {
            // @ts-ignore
            const electron = window.require('electron');
            ipcRenderer = electron.ipcRenderer;
        } catch (e) {
            console.error('Electron IPC not available');
            return;
        }

        const handleUpdate = (event: any, data: any) => {
            if (data.transcript) setTranscript(data.transcript);
            if (data.liveAssistantResponse !== undefined) setLiveAssistantResponse(data.liveAssistantResponse);
            if (data.liveInputText !== undefined) setLiveInputText(data.liveInputText);
            if (data.status) setStatus(data.status);
            if (data.error !== undefined) setError(data.error);
            if (data.sessionElapsed !== undefined) setSessionElapsed(data.sessionElapsed);
        };

        ipcRenderer.on('update-overlay-data', handleUpdate);

        // Notify main process we are ready
        ipcRenderer.send('overlay-ready');

        return () => {
            ipcRenderer.removeListener('update-overlay-data', handleUpdate);
        };
    }, []);

    // Apply specific styles for the transparent window
    useEffect(() => {
        document.body.style.backgroundColor = 'transparent';
        document.documentElement.style.backgroundColor = 'transparent';

        return () => {
            document.body.style.backgroundColor = '';
            document.documentElement.style.backgroundColor = '';
        };
    }, []);

    return (
        <div className="h-screen w-screen overflow-hidden bg-transparent">
            <div className="h-full w-full bg-slate-950/85 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col">
                {/* Drag Handle & Header */}
                <div className="h-8 w-full bg-slate-900/50 relative flex items-center justify-center cursor-move grouped-drag-region" style={{ WebkitAppRegion: 'drag' } as any}>

                    {/* Centered Title */}
                    <div className="flex items-center space-x-2 opacity-75 hover:opacity-100 transition-opacity">
                        <div className={`w-1.5 h-1.5 rounded-full ${status === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                        <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest">Monitor</span>
                    </div>

                    {/* Control Buttons - Absolute Right */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
                        {/* Start/Restart Session Button */}
                        {status !== 'CONNECTED' && (
                            <button
                                onClick={() => {
                                    try {
                                        // @ts-ignore
                                        const { ipcRenderer } = window.require('electron');
                                        ipcRenderer.send('overlay-start-session');
                                    } catch (e) {
                                        console.error('IPC not available');
                                    }
                                }}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded transition-colors"
                            >
                                Start
                            </button>
                        )}
                        {status === 'CONNECTED' && (
                            <button
                                onClick={() => {
                                    try {
                                        // @ts-ignore
                                        const { ipcRenderer } = window.require('electron');
                                        ipcRenderer.send('overlay-stop-session');
                                    } catch (e) {
                                        console.error('IPC not available');
                                    }
                                }}
                                className="bg-red-600 hover:bg-red-500 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded transition-colors"
                            >
                                Stop
                            </button>
                        )}
                        <button
                            onClick={() => {
                                window.close();
                            }}
                            className="text-slate-400 hover:text-white hover:bg-white/10 rounded p-1 transition-colors style-no-drag"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
                <div className="flex-1 w-full min-h-0">
                    <TranscriptOverlay
                        transcript={transcript}
                        liveAssistantResponse={liveAssistantResponse}
                        liveInputText={liveInputText}
                        status={status}
                        error={error}
                        sessionElapsed={sessionElapsed}
                    />
                </div>
            </div>
        </div>
    );
};

export default OverlayWrapper;
