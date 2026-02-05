import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { TranscriptEntry } from '../types';

interface TranscriptFeedProps {
  transcript: TranscriptEntry[];
  currentLiveAssistantResponse: { text: string; talkingPoints: string[] } | null;
  currentLiveInputText: string;
}

const CodeBlock = ({ children, className }: any) => {
  const [copied, setCopied] = useState(false);
  const codeString = String(children).replace(/\n$/, '');
  
  const copyCode = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <button
        onClick={copyCode}
        className="absolute right-2 top-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
      <pre className="overflow-x-auto p-4 bg-black border border-emerald-500/20 rounded-lg text-xs font-mono custom-scrollbar">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
};

const TranscriptFeed: React.FC<TranscriptFeedProps> = ({ transcript, currentLiveAssistantResponse, currentLiveInputText }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, currentLiveAssistantResponse, currentLiveInputText]);

  return (
    <div className="flex flex-col h-full bg-slate-900/30 rounded-2xl border border-slate-800/60 p-6 shadow-2xl min-h-0">
      <div className="flex-none flex items-center justify-between mb-6 pb-4 border-b border-slate-800/50">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Live Session Feed</h2>
        </div>
        <div className="text-[10px] font-bold text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700/50">
          Real-time Processing
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 min-h-0">
        <div className="space-y-8">
          {transcript.length === 0 && !currentLiveAssistantResponse && !currentLiveInputText && (
            <div className="h-64 flex flex-col items-center justify-center text-slate-600 opacity-20 select-none">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <p className="text-[10px] uppercase font-black tracking-[0.3em]">Monitoring Audio</p>
            </div>
          )}

          {transcript.map((entry) => (
            <div key={entry.id} className="group animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="flex items-center space-x-3 mb-2">
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${entry.speaker === 'Assistant'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                  {entry.speaker}
                </span>
                <span className="text-[9px] font-bold text-slate-600 tabular-nums">{entry.timestamp}</span>
              </div>

              <div className={`pl-4 border-l-2 ${entry.speaker === 'Assistant' ? 'border-emerald-500/50 bg-emerald-500/[0.02] py-3 rounded-r-lg' : 'border-slate-700 py-1'
                }`}>
                <div className={`text-sm leading-relaxed ${entry.speaker === 'Assistant' ? 'text-slate-100 font-medium' : 'text-slate-300'
                  }`}>
                  <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-code:text-indigo-300 prose-code:font-mono prose-code:bg-white/5 prose-code:px-1 prose-code:rounded">
                    <ReactMarkdown
                      components={{
                        pre: ({ node, children, ...props }) => <CodeBlock {...props}>{children}</CodeBlock>,
                        code: ({ node, inline, ...props }) => 
                          inline ? <code {...props} className="bg-white/10 px-1 py-0.5 rounded text-indigo-300 font-mono text-[0.9em]" /> : <code {...props} />
                      }}
                    >
                      {entry.text}
                    </ReactMarkdown>
                  </div>
                </div>

                {entry.talkingPoints && entry.talkingPoints.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-emerald-500/10">
                    <span className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest mb-2 block">Key Evidence</span>
                    <ul className="space-y-2">
                      {entry.talkingPoints.map((point, i) => (
                        <li key={i} className="flex items-start space-x-2 text-[13px] text-slate-400">
                          <span className="mt-1.5 h-1 w-1 rounded-full bg-emerald-500 shrink-0"></span>
                          <span className="leading-tight">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}

          {currentLiveInputText && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="flex items-center space-x-3 mb-2">
                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded">
                  Captured Audio
                </span>
                <div className="flex space-x-1 items-center">
                  <span className="w-1 h-1 bg-indigo-500 rounded-full animate-ping" />
                  <span className="text-[8px] font-bold text-indigo-400/60 uppercase tracking-widest">Streaming</span>
                </div>
              </div>
              <div className="pl-4 border-l-2 border-indigo-500/30 py-2 bg-indigo-500/[0.02] rounded-r-lg">
                <p className="text-sm leading-relaxed text-slate-400 italic opacity-60">
                  {currentLiveInputText}
                </p>
              </div>
            </div>
          )}

          {currentLiveAssistantResponse && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center space-x-3 mb-2">
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded">
                  Assistant
                </span>
                <div className="flex space-x-1">
                  <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" />
                  <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>

              <div className="pl-4 border-l-2 border-emerald-500/30 bg-emerald-500/[0.01] py-3 rounded-r-lg">
                <div className="text-sm leading-relaxed text-slate-300 font-medium">
                  <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-code:text-indigo-300 prose-code:font-mono prose-code:bg-white/5 prose-code:px-1 prose-code:rounded">
                    <ReactMarkdown
                      components={{
                        pre: ({ node, children, ...props }) => <CodeBlock {...props}>{children}</CodeBlock>,
                        code: ({ node, inline, ...props }) => 
                          inline ? <code {...props} className="bg-white/10 px-1 py-0.5 rounded text-indigo-300 font-mono text-[0.9em]" /> : <code {...props} />
                      }}
                    >
                      {currentLiveAssistantResponse.text || "Generating response..."}
                    </ReactMarkdown>
                  </div>
                </div>

                {currentLiveAssistantResponse.talkingPoints.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-emerald-500/10">
                    <span className="text-[8px] font-black text-emerald-500/40 uppercase tracking-widest mb-2 block">Key Evidence</span>
                    <ul className="space-y-2">
                      {currentLiveAssistantResponse.talkingPoints.map((point, i) => (
                        <li key={i} className="flex items-start space-x-2 text-[13px] text-slate-500">
                          <span className="mt-1.5 h-1 w-1 rounded-full bg-emerald-500 shrink-0 opacity-50"></span>
                          <span className="leading-tight italic">{point}</span>
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
      </div>
    </div>
  );
};

export default TranscriptFeed;
