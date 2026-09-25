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

const MOCK_WORKFLOWS: Workflow[] = [
  {
    id: 'wf-1',
    name: 'Inbound Support Triage',
    description: 'Automatically routes incoming calls, detects language, and qualifies the support intent before handing off.',
    status: 'active',
    createdAt: '2024-08-01T00:00:00Z',
    updatedAt: '2024-09-10T00:00:00Z',
    nodes: [
      { id: 'n1', type: 'trigger', title: 'Incoming Call Received', config: { defaultLanguage: 'English (Auto-Detect)' } },
      { id: 'n2', type: 'condition', title: 'Detect Language & Intent', config: { prompt: 'Identify the caller\'s language and primary intent from the first 30 seconds.' } },
      { id: 'n3', type: 'action', title: 'AI Agent Responds', config: { prompt: 'Greet the caller warmly and begin resolving their query based on the knowledge base.' } },
      { id: 'n4', type: 'integration', title: 'Sync to CRM', config: { integrationType: 'Salesforce' } },
    ]
  },
  {
    id: 'wf-2',
    name: 'Lead Qualification Flow',
    description: 'Outbound call workflow for qualifying inbound leads from web forms before passing to sales.',
    status: 'draft',
    createdAt: '2024-09-01T00:00:00Z',
    updatedAt: '2024-09-11T00:00:00Z',
    nodes: [
      { id: 'n1', type: 'trigger', title: 'Lead Form Submitted', config: {} },
      { id: 'n2', type: 'action', title: 'Initiate Outbound Call', config: { prompt: 'Call the lead within 5 minutes of form submission.' } },
    ]
  }
];

export const workflowsService = {
  list: async (): Promise<Workflow[]> => {
    try {
      const data = await api.get('/workflows');
      return data.data || data;
    } catch {
      return MOCK_WORKFLOWS;
    }
  },

  get: async (id: string): Promise<Workflow> => {
    try {
      const data = await api.get(`/workflows/${id}`);
      return data.data || data;
    } catch {
      return MOCK_WORKFLOWS.find(w => w.id === id) || MOCK_WORKFLOWS[0];
    }
  },

  create: async (workflowData: CreateWorkflowDto): Promise<Workflow> => {
    try {
      const data = await api.post('/workflows', workflowData);
      return data.data || data;
    } catch {
      return { id: `mock-${Date.now()}`, ...workflowData, status: 'draft', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    }
  },

  update: async (id: string, updates: Partial<CreateWorkflowDto>): Promise<Workflow> => {
    try {
      const data = await api.put(`/workflows/${id}`, updates);
      return data.data || data;
    } catch {
      return MOCK_WORKFLOWS.find(w => w.id === id) || MOCK_WORKFLOWS[0];
    }
  },

  delete: async (id: string): Promise<void> => {
    try { await api.delete(`/workflows/${id}`); } catch { /* silent */ }
  }
};
