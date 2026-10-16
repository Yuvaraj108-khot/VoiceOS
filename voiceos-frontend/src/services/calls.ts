
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
  triggerOutboundCall: async (payload: TriggerCallPayload): Promise<TriggerCallResponse> => {
    const res = await api.post('/calls/trigger', payload);
    if (!res || res.success === false || res.error) {
      const errMsg =
        res?.error?.message ||
        (typeof res?.error === 'string' ? res.error : null) ||
        res?.message ||
        'Failed to initiate outbound call.';
      throw new Error(errMsg);
    }
    return res.data || res;
  },


  // Real live call details from backend
  getLiveCall: async (): Promise<CallDetails | null> => {
    try {
      const res = await api.get('/calls/active');
      if (res && res.data && res.data.id) {
        return {
          ...res.data,
          transcript: Array.isArray(res.data.transcript) ? res.data.transcript : []
        };
      }
      return null;
    } catch (err) {
      console.warn('[callsService] Failed to fetch active call from backend:', err);
      return null;
    }
  }
};

