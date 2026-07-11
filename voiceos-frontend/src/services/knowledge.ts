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

export const knowledgeService = {
  list: async (): Promise<KnowledgeDocument[]> => {
    const data = await api.get('/knowledge');
    return data.data || data;
  },

  get: async (id: string): Promise<KnowledgeDocument> => {
    const data = await api.get(`/knowledge/${id}`);
    return data.data || data;
  },

  create: async (documentData: CreateKnowledgeDocumentDto, file?: File): Promise<KnowledgeDocument> => {
    if (file) {
      // Need to handle FormData for file uploads differently than JSON
      const formData = new FormData();
      formData.append('title', documentData.title);
      formData.append('type', documentData.type);
      formData.append('file', file);
      
      const res = await fetch(`http://localhost:3000/api/v1/knowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.data || data;
    } else {
      const data = await api.post('/knowledge', documentData);
      return data.data || data;
    }
  },

  update: async (id: string, updates: Partial<CreateKnowledgeDocumentDto>): Promise<KnowledgeDocument> => {
    // Assuming patch is added to api client, falling back to fetch
    const res = await fetch(`http://localhost:3000/api/v1/knowledge/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.data || data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/knowledge/${id}`);
  }
};
