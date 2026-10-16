import { api } from '../api';

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'integration' | 'completion';
  title: string;
  config: {
    prompt?: string;
    voice?: string;
    language?: string;
    integrationType?: string;
    bargeInEnabled?: boolean;
    silenceTimeoutMs?: number;
    destination?: string;
    branches?: string[];
    [key: string]: any;
  };
  next?: string[];
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'draft' | 'archived';
  nodes: WorkflowNode[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowDto {
  name: string;
  description: string;
  nodes: WorkflowNode[];
}

let MOCK_WORKFLOWS: Workflow[] = [];

export const workflowsService = {
  list: async (): Promise<Workflow[]> => {
    try {
      const res = await api.get('/workflows');
      const raw = res.data || res;
      const list = Array.isArray(raw) ? raw : (raw.items || []);
      if (Array.isArray(list)) {
        return list;
      }
      return [];
    } catch {
      return [];
    }
  },

  get: async (id: string): Promise<Workflow> => {
    try {
      const data = await api.get(`/workflows/${id}`);
      return data.data || data;
    } catch {
      const found = MOCK_WORKFLOWS.find(w => w.id === id);
      if (found) return found;
      throw new Error(`Workflow ${id} not found`);
    }
  },

  create: async (workflowData: CreateWorkflowDto): Promise<Workflow> => {
    try {
      const data = await api.post('/workflows', workflowData);
      return data.data || data;
    } catch {
      const newWf: Workflow = {
        id: `wf-${Date.now()}`,
        ...workflowData,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      MOCK_WORKFLOWS.unshift(newWf);
      return newWf;
    }
  },

  update: async (id: string, updates: Partial<Workflow>): Promise<Workflow> => {
    try {
      const data = await api.put(`/workflows/${id}`, updates);
      return data.data || data;
    } catch {
      MOCK_WORKFLOWS = MOCK_WORKFLOWS.map(w => w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w);
      return MOCK_WORKFLOWS.find(w => w.id === id) || MOCK_WORKFLOWS[0];
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`/workflows/${id}`);
    } catch {
      MOCK_WORKFLOWS = MOCK_WORKFLOWS.filter(w => w.id !== id);
    }
  }
};
