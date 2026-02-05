
export interface TranscriptEntry {
  id: string;
  timestamp: string;
  speaker: 'User' | 'Participant' | 'Assistant';
  text: string;
  isFinal: boolean;
  talkingPoints?: string[];
}

export interface MeetingSession {
  id: string;
  date: string;
  transcript: TranscriptEntry[];
  title: string;
}

export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}
