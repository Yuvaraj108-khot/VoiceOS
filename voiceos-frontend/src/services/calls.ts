
import { api } from '../api';

export interface CallParticipant {
  role: 'AI' | 'Caller';
  message: string;
  timestamp: string;
}

export interface CallDetails {
  id: string;
  callerNumber: string;
  duration: string;
  agentId: string;
  status: 'active' | 'completed';
  transcript: CallParticipant[];
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  sentimentScore: number;
  intent: string;
  confidence: number;
  callerName: string;
  accountStatus: string;
  language: string;
  summary: string;
}

export interface TriggerCallPayload {
  employeeId: string;
  toNumber: string;
  customerId?: string;
  variables?: Record<string, any>;
}

export interface TriggerCallResponse {
  id: string;
  twilioCallSid?: string;
  status: string;
  toNumber: string;
  fromNumber?: string;
}

export const callsService = {
  // Trigger an outbound phone call
  triggerOutboundCall: async (payload: TriggerCallPayload): Promise<TriggerCallResponse> => {
    const res = await api.post('/calls/trigger', payload);
    return res.data || res;
  },


  // Mock live call details for the Live Call Center page
  getLiveCall: async (): Promise<CallDetails> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: 'call_live_123',
          callerNumber: '+1 (555) 0123',
          duration: '04:12',
          agentId: 'Alpha-9',
          status: 'active',
          sentiment: 'Positive',
          sentimentScore: 85,
          intent: 'Schedule Appointment',
          confidence: 98.4,
          callerName: 'Mark Stevenson (Unverified)',
          accountStatus: 'Standard',
          language: 'English (US)',
          summary: "Caller requested a consultation appointment for next Tuesday. Agent offered 2:00 PM and 4:30 PM slots. Caller selected 2:00 PM. Agent is currently explaining requirements...",
          transcript: [
            {
              role: 'AI',
              timestamp: '10:02 AM',
              message: 'Hello! Thank you for calling VoiceOS customer support. This is Alpha-9. How can I help you today?'
            },
            {
              role: 'Caller',
              timestamp: '10:02 AM',
              message: "Hi, I'd like to schedule an appointment for a consultation next Tuesday afternoon."
            },
            {
              role: 'AI',
              timestamp: '10:03 AM',
              message: 'I can certainly help with that. Let me check the availability for Tuesday. We have slots at 2:00 PM and 4:30 PM. Would either of those work for you?'
            },
            {
              role: 'Caller',
              timestamp: '10:04 AM',
              message: '2:00 PM sounds great. What do I need to bring?'
            }
          ]
        });
      }, 500);
    });
  }
};

