import { api } from '../api';

export interface WorkflowNode {
  id: string;
  type: string;
  title: string;
  config: any;
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

export const workflowsService = {
  list: async (): Promise<Workflow[]> => {
    const data = await api.get('/workflows');
    return data.data || data;
  },

  get: async (id: string): Promise<Workflow> => {
    const data = await api.get(`/workflows/${id}`);
    return data.data || data;
  },

  create: async (workflowData: CreateWorkflowDto): Promise<Workflow> => {
    const data = await api.post('/workflows', workflowData);
    return data.data || data;
  },

  update: async (id: string, updates: Partial<CreateWorkflowDto>): Promise<Workflow> => {
    const data = await api.put(`/workflows/${id}`, updates);
    return data.data || data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/workflows/${id}`);
  }
};
