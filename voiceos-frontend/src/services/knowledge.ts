import { api } from '../api';

export interface KnowledgeDocument {
  id: string;
  title: string;
  type: string;
  status: 'Syncing' | 'Active' | 'Error';
  lastUpdated: string;
  size?: number;
  url?: string;
  content?: string;
}

export interface CreateKnowledgeDocumentDto {
  title: string;
  type: string;
  content?: string;
  url?: string;
}

const MOCK_DOCUMENTS: KnowledgeDocument[] = [
  { id: 'k1', title: 'Product FAQ v3.2', type: 'document', status: 'Active', lastUpdated: '2024-09-10T00:00:00Z', size: 2.4 * 1024 * 1024 },
  { id: 'k2', title: 'Enterprise Pricing Guide', type: 'document', status: 'Active', lastUpdated: '2024-08-22T00:00:00Z', size: 1.1 * 1024 * 1024 },
  { id: 'k3', title: 'Support Playbook 2024', type: 'document', status: 'Syncing', lastUpdated: '2024-09-11T00:00:00Z', size: 5.6 * 1024 * 1024 },
  { id: 'k4', title: 'https://docs.voiceos.io/api', type: 'website', status: 'Active', lastUpdated: '2024-09-01T00:00:00Z' },
  { id: 'k5', title: 'Legal Compliance Pack', type: 'document', status: 'Active', lastUpdated: '2024-07-15T00:00:00Z', size: 3.2 * 1024 * 1024 },
];

export const knowledgeService = {
  list: async (): Promise<KnowledgeDocument[]> => {
    try {
      const data = await api.get('/knowledge');
      return data.data || data;
    } catch {
      return MOCK_DOCUMENTS;
    }
  },

  get: async (id: string): Promise<KnowledgeDocument> => {
    try {
      const data = await api.get(`/knowledge/${id}`);
      return data.data || data;
    } catch {
      return MOCK_DOCUMENTS.find(d => d.id === id) || MOCK_DOCUMENTS[0];
    }
  },

  create: async (documentData: CreateKnowledgeDocumentDto, file?: File): Promise<KnowledgeDocument> => {
    try {
      if (file) {
        const formData = new FormData();
        formData.append('title', documentData.title);
        formData.append('type', documentData.type);
        formData.append('file', file);
        const res = await fetch(`http://localhost:3000/api/v1/knowledge`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return data.data || data;
      } else {
        const data = await api.post('/knowledge', documentData);
        return data.data || data;
      }
    } catch {
      return { id: `mock-${Date.now()}`, ...documentData, status: 'Syncing', lastUpdated: new Date().toISOString() };
    }
  },

  update: async (id: string, updates: Partial<CreateKnowledgeDocumentDto>): Promise<KnowledgeDocument> => {
    try {
      const res = await fetch(`http://localhost:3000/api/v1/knowledge/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.data || data;
    } catch {
      return MOCK_DOCUMENTS.find(d => d.id === id) || MOCK_DOCUMENTS[0];
    }
  },

  delete: async (id: string): Promise<void> => {
    try { await api.delete(`/knowledge/${id}`); } catch { /* silent */ }
  }
};
