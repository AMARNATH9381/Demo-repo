
import React, { useState } from 'react';
import { MeetingSession } from '../types';

interface HistoryModalProps {
  history: MeetingSession[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ history, onClose, onDelete, onClearAll }) => {
  const [selectedSession, setSelectedSession] = useState<MeetingSession | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'single' | 'all', id?: string } | null>(null);

  const confirmAction = () => {
    if (deleteConfirmation?.type === 'single' && deleteConfirmation.id) {
      onDelete(deleteConfirmation.id);
      if (selectedSession?.id === deleteConfirmation.id) setSelectedSession(null);
    } else if (deleteConfirmation?.type === 'all') {
      onClearAll();
      setSelectedSession(null);
    }
    setDeleteConfirmation(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[80vh] bg-[#020617] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">

        {/* Custom Confirmation Overlay */}
        {deleteConfirmation && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 border border-white/10 p-8 rounded-2xl max-w-md w-full shadow-2xl space-y-6">
              <div className="space-y-2 text-center">
                <div className="w-12 h-12 mx-auto bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white">
                  {deleteConfirmation.type === 'all' ? 'Clear All History?' : 'Delete Session?'}
                </h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  {deleteConfirmation.type === 'all'
                    ? "This will permanently remove all recorded meetings and transcripts. This action cannot be undone."
                    : "This will permanently remove this meeting transcript. This action cannot be undone."}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setDeleteConfirmation(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all"
                >
                  {deleteConfirmation.type === 'all' ? 'Confirm Clear' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex-none px-8 py-6 border-b border-white/5 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white">Meeting History</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Access past pilot sessions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Sessions List */}
          <div className="w-1/3 border-r border-white/5 flex flex-col min-w-[280px]">
            {/* Sidebar Header with Clear All Button */}
            <div className="flex-none p-4 flex items-center justify-between border-b border-white/5">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                {history.length} Saved {history.length === 1 ? 'Session' : 'Sessions'}
              </span>
              {history.length > 0 && (
                <button
                  onClick={() => setDeleteConfirmation({ type: 'all' })}
                  className="text-[9px] font-black uppercase tracking-widest text-red-500/60 hover:text-red-400 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 px-8 text-center">
                  <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">No sessions recorded yet</p>
                </div>
              ) : (
                history.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    className={`group relative p-4 rounded-2xl border transition-all cursor-pointer ${selectedSession?.id === session.id
                        ? 'bg-indigo-600/10 border-indigo-500/50'
                        : 'bg-white/5 border-transparent hover:border-white/10 hover:bg-white/[0.07]'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-xs font-bold text-slate-200 truncate pr-4">{session.title}</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmation({ type: 'single', id: session.id });
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">{session.date}</p>
                    <p className="text-[9px] text-indigo-400/60 font-black uppercase tracking-widest mt-2">
                      {session.transcript.length} Entries
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Main Content - Transcript Viewer */}
          <div className="flex-1 bg-slate-950/40 flex flex-col min-w-0">
            {selectedSession ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 min-h-0">
                <div className="max-w-3xl mx-auto space-y-8">
                  <div className="pb-6 border-b border-white/5">
                    <h2 className="text-xl font-bold text-white mb-2">{selectedSession.title}</h2>
                    <div className="flex items-center space-x-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      <span>{selectedSession.date}</span>
                      <span className="w-1 h-1 bg-slate-700 rounded-full" />
                      <span>{selectedSession.transcript.filter(t => t.speaker === 'Participant').length} Interjections</span>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {selectedSession.transcript.map((entry) => (
                      <div key={entry.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${entry.speaker === 'Assistant'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                            {entry.speaker}
                          </span>
                          <span className="text-[9px] font-bold text-slate-600 tabular-nums">{entry.timestamp}</span>
                        </div>

                        <div className={`pl-4 border-l-2 ${entry.speaker === 'Assistant' ? 'border-emerald-500/50 bg-emerald-500/[0.02] py-4 rounded-r-2xl' : 'border-slate-800 py-1'
                          }`}>
                          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${entry.speaker === 'Assistant' ? 'text-slate-100 font-medium' : 'text-slate-300'
                            }`}>
                            {entry.text}
                          </p>

                          {entry.talkingPoints && entry.talkingPoints.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/5">
                              <span className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest mb-3 block">Extracted Evidence</span>
                              <ul className="space-y-3">
                                {entry.talkingPoints.map((point, i) => (
                                  <li key={i} className="flex items-start space-x-3 text-[13px] text-slate-400">
                                    <div className="mt-1.5 h-1 w-1 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                                    <span className="leading-snug">{point}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-600 opacity-20 px-8 text-center select-none">
                <div className="w-24 h-24 mb-6 bg-slate-800/20 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  </svg>
                </div>
                <h3 className="text-xs font-black uppercase tracking-[0.3em]">Select a session</h3>
                <p className="text-[10px] mt-2 font-bold max-w-[200px] leading-relaxed">Review the technical details and evidence from your past meetings.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
