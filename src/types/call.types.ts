import type { CallDirection, CallStatus } from '@prisma/client';

export interface CallSession {
  callId: string;
  twilioCallSid: string;
  organizationId: string;
  employeeId: string;
  phoneNumberId?: string;
  customerId?: string;
  direction: CallDirection;
  status: CallStatus;
  fromNumber: string;
  toNumber: string;
  language: string;
  startedAt: Date;
  answeredAt?: Date;
  conversationHistory: ConversationTurn[];
  metadata: Record<string, unknown>;
}

export interface ConversationTurn {
  role: 'caller' | 'ai';
  text: string;
  timestamp: Date;
  confidence?: number;
  startMs?: number;
  endMs?: number;
}

export interface ActiveCallMap {
  [callSid: string]: CallSession;
}

export interface TwilioMediaStreamMessage {
  event: 'start' | 'media' | 'stop' | 'mark' | 'connected';
  sequenceNumber?: string;
  start?: {
    streamSid: string;
    callSid: string;
    accountSid: string;
    tracks: string[];
    customParameters: Record<string, string>;
    mediaFormat: {
      encoding: string;
      sampleRate: number;
      channels: number;
    };
  };
  media?: {
    track: string;
    chunk: string;
    timestamp: string;
    payload: string; // base64 μ-law audio
  };
  stop?: {
    streamSid: string;
    callSid: string;
    accountSid: string;
  };
}

export interface STTResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  language?: string;
  startMs?: number;
  endMs?: number;
}

export interface CallAnalytics {
  duration: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  satisfactionScore?: number;
  wasTransferred: boolean;
  appointmentBooked: boolean;
  leadCreated: boolean;
  language: string;
  cost?: number;
}
