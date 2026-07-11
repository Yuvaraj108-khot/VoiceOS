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

export const aiEmployeesService = {
  list: async (): Promise<AIEmployee[]> => {
    const data = await api.get('/ai-employees');
    return data.data || data;
  },

  get: async (id: string): Promise<AIEmployee> => {
    const data = await api.get(`/ai-employees/${id}`);
    return data.data || data;
  },

  create: async (employeeData: CreateAIEmployeeDto): Promise<AIEmployee> => {
    const data = await api.post('/ai-employees', employeeData);
    return data.data || data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/ai-employees/${id}`);
  }
};
