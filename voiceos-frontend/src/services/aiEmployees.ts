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
  systemPrompt?: string;
  firstMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAIEmployeeDto {
  name: string;
  role: string;
  voiceModel: string;
  language: string;
  instructions: string;
  firstMessage?: string;
  status?: 'Active' | 'Idle' | 'Offline';
}

export interface UpdateAIEmployeeDto {
  name?: string;
  role?: string;
  voiceModel?: string;
  language?: string;
  instructions?: string;
  firstMessage?: string;
  status?: 'Active' | 'Idle' | 'Offline';
}

export const INITIAL_AI_EMPLOYEES: AIEmployee[] = [
  {
    id: '7a007f62-0dad-4368-9f1b-d6ff7181429d',
    name: 'Yuvaraj',
    role: 'Sales Development Representative',
    voiceModel: 'en-US-GuyNeural (US Male)',
    language: 'English (US)',
    status: 'Active',
    callsHandled: 0,
    successRate: 0,
    systemPrompt: 'You are Yuvaraj, an AI Sales Development Representative at VoiceOS. Always wait and keep assisting until the caller says thank you.',
    firstMessage: "Hi! Thanks for reaching out. I'm Yuvaraj, your AI Sales Development Representative. How can I help you today?",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cb801435-ffea-4424-a06e-2ce7e79a2092',
    name: 'Support Agent A',
    role: 'Customer Support Executive',
    voiceModel: 'en-US-JennyNeural (US Female)',
    language: 'English (US)',
    status: 'Active',
    callsHandled: 0,
    successRate: 0,
    systemPrompt: 'You are an intelligent VoiceOS customer support representative. Always wait and keep assisting until the caller says thank you.',
    firstMessage: "Hello! Thank you for calling customer support. How can I assist you with your order or account today?",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let inMemoryStore: AIEmployee[] = [...INITIAL_AI_EMPLOYEES];

export const resolveVoiceId = (voiceNameOrModel?: string): string => {
  if (!voiceNameOrModel) return 'en-US-GuyNeural';
  const v = voiceNameOrModel.toLowerCase();
  if (v.includes('prabhat')) return 'en-IN-PrabhatNeural';
  if (v.includes('neerja')) return 'en-IN-NeerjaNeural';
  if (v.includes('sonia')) return 'en-GB-SoniaNeural';
  if (v.includes('jenny')) return 'en-US-JennyNeural';
  if (v.includes('ryan')) return 'en-GB-RyanNeural';
  if (v.includes('oliver') || v.includes('kael') || v.includes('guy') || v.includes('male')) {
    if (v.includes('uk') || v.includes('british') || v.includes('oliver') || v.includes('ryan')) return 'en-GB-RyanNeural';
    if (v.includes('in') || v.includes('indian') || v.includes('prabhat')) return 'en-IN-PrabhatNeural';
    return 'en-US-GuyNeural';
  }
  if (v.includes('aria') || v.includes('sophia') || v.includes('elena') || v.includes('female')) {
    return 'en-US-AriaNeural';
  }

  const match = voiceNameOrModel.match(/([a-z]{2}-[A-Z]{2,3}-[a-zA-Z]+Neural)/i);
  if (match) return match[1];

  return 'en-US-GuyNeural';
};

export const aiEmployeesService = {
  list: async (): Promise<AIEmployee[]> => {
    try {
      const res = await api.get('/ai-employees');
      const raw = res.data || res;
      const items = Array.isArray(raw) ? raw : (raw.items || []);
      if (items.length === 0) {
        return inMemoryStore.length > 0 ? inMemoryStore : INITIAL_AI_EMPLOYEES;
      }
      return items.map((emp: any) => ({
        id: emp.id,
        name: emp.name,
        role: emp.role,
        voiceModel: emp.voiceProfile?.voiceName || emp.voiceProfile?.voiceId || emp.voiceModel || 'en-US-JennyNeural (US Female)',
        language: (emp.languages && emp.languages[0]) ? (emp.languages[0] === 'en' ? 'English (US)' : emp.languages[0]) : 'English (US)',
        status: emp.status === 'ACTIVE' ? 'Active' : (emp.status === 'DRAFT' ? 'Idle' : (emp.status || 'Active')),
        callsHandled: emp.callsHandled ?? (emp._count?.calls ?? 0),
        successRate: emp.avgSatisfaction ? Math.round(emp.avgSatisfaction * 20) : 0,
        systemPrompt: emp.systemPrompt || '',
        firstMessage: emp.firstMessage || '',
        createdAt: emp.createdAt || new Date().toISOString(),
        updatedAt: emp.updatedAt || new Date().toISOString(),
      }));
    } catch {
      return inMemoryStore.length > 0 ? inMemoryStore : INITIAL_AI_EMPLOYEES;
    }
  },

  get: async (id: string): Promise<AIEmployee> => {
    try {
      const res = await api.get(`/ai-employees/${id}`);
      const emp = res.data || res;
      return {
        id: emp.id,
        name: emp.name,
        role: emp.role,
        voiceModel: emp.voiceProfile?.voiceName || emp.voiceProfile?.voiceId || 'Aria (US Female)',
        language: emp.currentLanguage || 'English (US)',
        status: emp.status === 'ACTIVE' ? 'Active' : 'Idle',
        callsHandled: emp.callsHandled ?? 0,
        successRate: 0,
        systemPrompt: emp.systemPrompt || '',
        firstMessage: emp.firstMessage || '',
        createdAt: emp.createdAt,
        updatedAt: emp.updatedAt,
      };
    } catch {
      const found = inMemoryStore.find(e => e.id === id);
      if (found) return found;
      throw new Error(`AI Employee ${id} not found`);
    }
  },

  create: async (employeeData: CreateAIEmployeeDto): Promise<AIEmployee> => {
    const defaultGreeting = `Hi! Thanks for reaching out. I'm ${employeeData.name}, your AI ${employeeData.role}. How can I help you today?`;
    const backendPayload = {
      name: employeeData.name,
      role: employeeData.role,
      systemPrompt: employeeData.instructions || 'Be helpful and consultative.',
      welcomeMessage: employeeData.firstMessage || defaultGreeting,
      language: 'en',
      voiceProvider: 'EDGE_TTS',
      voiceId: resolveVoiceId(employeeData.voiceModel),
    };
    const res = await api.post('/ai-employees', backendPayload);
    const created = res.data || res;
    const newEmp: AIEmployee = {
      id: created.id,
      name: created.name || employeeData.name,
      role: created.role || employeeData.role,
      voiceModel: employeeData.voiceModel,
      language: employeeData.language || 'English (US)',
      status: 'Active',
      callsHandled: 0,
      successRate: 100,
      systemPrompt: backendPayload.systemPrompt,
      firstMessage: backendPayload.welcomeMessage,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryStore = [newEmp, ...inMemoryStore];
    return newEmp;
  },

  update: async (id: string, updateData: UpdateAIEmployeeDto): Promise<AIEmployee> => {
    try {
      const backendPayload: any = {};
      if (updateData.name) backendPayload.name = updateData.name;
      if (updateData.role) backendPayload.role = updateData.role;
      if (updateData.instructions !== undefined) backendPayload.systemPrompt = updateData.instructions;
      if (updateData.firstMessage !== undefined) backendPayload.welcomeMessage = updateData.firstMessage;
      if (updateData.voiceModel) {
        backendPayload.voiceProvider = 'EDGE_TTS';
        backendPayload.voiceId = resolveVoiceId(updateData.voiceModel);
      }
      if (updateData.status) {
        backendPayload.status = updateData.status.toUpperCase();
      }

      await api.put(`/ai-employees/${id}`, backendPayload);
    } catch {
      // Local fallback
    }

    inMemoryStore = inMemoryStore.map(emp => {
      if (emp.id === id) {
        return {
          ...emp,
          ...(updateData.name && { name: updateData.name }),
          ...(updateData.role && { role: updateData.role }),
          ...(updateData.voiceModel && { voiceModel: updateData.voiceModel }),
          ...(updateData.language && { language: updateData.language }),
          ...(updateData.status && { status: updateData.status }),
          ...(updateData.instructions !== undefined && { systemPrompt: updateData.instructions }),
          ...(updateData.firstMessage !== undefined && { firstMessage: updateData.firstMessage }),
          updatedAt: new Date().toISOString()
        };
      }
      return emp;
    });

    return inMemoryStore.find(e => e.id === id)!;
  },

  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`/ai-employees/${id}`);
    } catch {
      // Silent fallback
    }
    inMemoryStore = inMemoryStore.filter(emp => emp.id !== id);
  },

  provisionPhoneNumber: async (employeeId: string, areaCode?: string): Promise<any> => {
    const data = await api.post(`/ai-employees/${employeeId}/phone-number`, { areaCode });
    return data.data || data;
  }
};
