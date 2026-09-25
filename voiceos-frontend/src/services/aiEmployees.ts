import { api } from '../api';

export interface AIEmployee {
  id: string;
  name: string;
  role: string;
  voiceModel: string;
  language: string;
  status: 'Active' | 'Idle' | 'Offline';
  callsHandled: number;
  successRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAIEmployeeDto {
  name: string;
  role: string;
  voiceModel: string;
  language: string;
  instructions: string;
}

const MOCK_EMPLOYEES: AIEmployee[] = [
  { id: '1', name: 'Sienna', role: 'Senior Support Executive', voiceModel: 'Sophia', language: 'English (US)', status: 'Active', callsHandled: 4821, successRate: 98.2, createdAt: '2024-01-10T00:00:00Z', updatedAt: '2024-09-10T00:00:00Z' },
  { id: '2', name: 'Marcus', role: 'Sales Development Rep', voiceModel: 'Oliver', language: 'English (UK)', status: 'Active', callsHandled: 3109, successRate: 91.7, createdAt: '2024-02-15T00:00:00Z', updatedAt: '2024-09-11T00:00:00Z' },
  { id: '3', name: 'Nova', role: 'Technical Concierge', voiceModel: 'Kael', language: 'English (AU)', status: 'Idle', callsHandled: 2450, successRate: 87.3, createdAt: '2024-03-20T00:00:00Z', updatedAt: '2024-09-09T00:00:00Z' },
  { id: '4', name: 'Elena', role: 'Executive Assistant', voiceModel: 'Elena', language: 'Spanish (EN Accent)', status: 'Offline', callsHandled: 1203, successRate: 94.1, createdAt: '2024-04-01T00:00:00Z', updatedAt: '2024-09-08T00:00:00Z' },
];

export const aiEmployeesService = {
  list: async (): Promise<AIEmployee[]> => {
    try {
      const data = await api.get('/ai-employees');
      return data.data || data;
    } catch {
      return MOCK_EMPLOYEES;
    }
  },

  get: async (id: string): Promise<AIEmployee> => {
    try {
      const data = await api.get(`/ai-employees/${id}`);
      return data.data || data;
    } catch {
      return MOCK_EMPLOYEES.find(e => e.id === id) || MOCK_EMPLOYEES[0];
    }
  },

  create: async (employeeData: CreateAIEmployeeDto): Promise<AIEmployee> => {
    try {
      const backendPayload = {
        name: employeeData.name,
        role: employeeData.role,
        systemPrompt: employeeData.instructions,
        welcomeMessage: employeeData.instructions,
        language: 'en',
        voiceProvider: 'ELEVENLABS',
        voiceId: employeeData.voiceModel === 'Oliver' ? '21m00Tcm4TlvDq8ikWAM' : 'default_voice'
      };
      const data = await api.post('/ai-employees', backendPayload);
      return data.data || data;
    } catch {
      // Simulate success for demo
      return { id: `mock-${Date.now()}`, ...employeeData, status: 'Idle', callsHandled: 0, successRate: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    }
  },

  delete: async (id: string): Promise<void> => {
    try { await api.delete(`/ai-employees/${id}`); } catch { /* silent */ }
  },

  provisionPhoneNumber: async (employeeId: string, areaCode?: string): Promise<any> => {
    const data = await api.post(`/ai-employees/${employeeId}/phone-number`, { areaCode });
    return data.data || data;
  }
};
