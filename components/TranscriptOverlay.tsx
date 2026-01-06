import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TranscriptEntry } from '../types';

interface TranscriptOverlayProps {
    transcript: TranscriptEntry[];
    liveAssistantResponse: { text: string; talkingPoints: string[] } | null;
    liveInputText: string;
}

const TranscriptOverlay: React.FC<TranscriptOverlayProps> = ({
    transcript,
    liveAssistantResponse,
    liveInputText
}) => {
    const bottomRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
    const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
    const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());

    // Smart Auto-Scroll with user interaction detection
    useEffect(() => {
        if (isAutoScrollEnabled && !isUserScrolledUp) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [transcript, liveAssistantResponse, liveInputText, isUserScrolledUp, isAutoScrollEnabled]);

    // Handle user interaction
    useEffect(() => {
        const handleUserActivity = () => {
            setLastInteractionTime(Date.now());
        };

        window.addEventListener('mousemove', handleUserActivity);
        window.addEventListener('keydown', handleUserActivity);
        window.addEventListener('scroll', handleUserActivity);

        return () => {
            window.removeEventListener('mousemove', handleUserActivity);
            window.removeEventListener('keydown', handleUserActivity);
            window.removeEventListener('scroll', handleUserActivity);
        };
    }, []);

    const handleScroll = useCallback(() => {
        if (scrollContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;

            if (!isAtBottom && scrollHeight > clientHeight) {
                setIsUserScrolledUp(true);
                setIsAutoScrollEnabled(false);
            } else if (isAtBottom) {
                setIsUserScrolledUp(false);
                setIsAutoScrollEnabled(true);
            }
        }
    }, []);

    // Auto-resume
    useEffect(() => {
        const timer = setInterval(() => {
            const timeSinceInteraction = Date.now() - lastInteractionTime;
            if (timeSinceInteraction > 5000 && !isUserScrolledUp) {
                setIsAutoScrollEnabled(true);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [lastInteractionTime, isUserScrolledUp]);

    const scrollToBottom = () => {
        setIsUserScrolledUp(false);
        setIsAutoScrollEnabled(true);
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="h-full w-full bg-slate-950/90 backdrop-blur-xl text-slate-200 p-4 flex flex-col overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Scroll Container */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto space-y-8 pr-2 pb-2 custom-scrollbar"
            >
                {transcript.length === 0 && !liveAssistantResponse && !liveInputText && (
                    <div className="h-full flex flex-col items-center justify-center opacity-40 text-center space-y-6">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full border-2 border-indigo-500/30 flex items-center justify-center">
                                <div className="w-4 h-4 bg-indigo-500 rounded-full animate-pulse" />
                            </div>
                            <div className="absolute -inset-2 border-2 border-indigo-500/10 rounded-full animate-ping" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Waiting for audio...</p>
                    </div>
                )}

                {transcript.map((entry) => (
                    <div key={entry.id} className="group animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="flex items-center space-x-3 mb-3">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${entry.speaker === 'Assistant'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}>
                                {entry.speaker}
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 tabular-nums">{entry.timestamp}</span>
                        </div>

                        <div className={`pl-4 ${entry.speaker === 'Assistant' ? 'border-l-2 border-emerald-500/50' : 'border-l-2 border-slate-700'
                            }`}>
                            <p className={`text-base leading-relaxed whitespace-pre-wrap ${entry.speaker === 'Assistant' ? 'text-slate-100 font-medium' : 'text-slate-300'
                                }`}>
                                {entry.text}
                            </p>

                            {entry.talkingPoints && entry.talkingPoints.length > 0 && (
                                <div className="mt-4 pt-2 space-y-3">
                                    <span className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest block">Key Evidence</span>
                                    <ul className="space-y-2">
                                        {entry.talkingPoints.map((point, i) => (
                                            <li key={i} className="flex items-start space-x-3 text-sm text-slate-400">
                                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                                <span className="leading-relaxed">{point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {liveInputText && (
                    <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="flex items-center space-x-3 mb-3">
                            <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
                                Captured Audio
                            </span>
                            <div className="flex space-x-1.5 items-center">
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                                <span className="text-[9px] font-bold text-indigo-400/60 uppercase tracking-widest">Streaming</span>
                            </div>
                        </div>
                        <div className="pl-4 border-l-2 border-indigo-500/30">
                            <p className="text-base leading-relaxed text-slate-400 italic opacity-60">
                                {liveInputText}
                            </p>
                        </div>
                    </div>
                )}

                {liveAssistantResponse && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center space-x-3 mb-3">
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
                                Assistant
                            </span>
                            <div className="flex space-x-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                            </div>
                        </div>

                        <div className="pl-4 border-l-2 border-emerald-500/30">
                            <p className="text-base leading-relaxed text-slate-300 font-medium whitespace-pre-wrap">
                                {liveAssistantResponse.text || "Generating response..."}
                            </p>

                            {liveAssistantResponse.talkingPoints.length > 0 && (
                                <div className="mt-4 pt-2 space-y-3">
                                    <span className="text-[9px] font-black text-emerald-500/40 uppercase tracking-widest block">Key Evidence</span>
                                    <ul className="space-y-2">
                                        {liveAssistantResponse.talkingPoints.map((point, i) => (
                                            <li key={i} className="flex items-start space-x-3 text-sm text-slate-500">
                                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 opacity-50"></span>
                                                <span className="leading-relaxed italic">{point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div ref={bottomRef} className="h-4" />
            </div>

            {/* Floating Scroll to Bottom Button */}
            {isUserScrolledUp && (
                <button
                    onClick={scrollToBottom}
                    className="absolute bottom-8 right-8 z-50 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-full shadow-lg shadow-indigo-900/20 backdrop-blur-sm transition-all animate-in fade-in zoom-in duration-200 flex items-center space-x-2 border border-indigo-400/20"
                >
                    <span>↓</span>
                    <span>Latest</span>
                </button>
            )}
        </div>
    );
};

export default TranscriptOverlay;
