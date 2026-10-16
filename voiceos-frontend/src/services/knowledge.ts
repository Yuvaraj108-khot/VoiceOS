import { api } from '../api';

export type KnowledgeCategory = 'document' | 'structured' | 'live';

export interface KnowledgeDocument {
  id: string;
  title: string;
  type: 'PDF' | 'PPTX' | 'DOCX' | 'TXT' | 'CSV' | 'XLSX' | 'SPREADSHEET' | 'WEBSITE' | 'DOCUMENT' | string;
  category: KnowledgeCategory;
  status: 'Syncing' | 'Active' | 'Error';
  lastUpdated: string;
  lastSynced?: string;
  rowCount?: number;
  columns?: string[];
  primaryKey?: string;
  size?: number;
  url?: string;
  content?: string;
}

export interface CreateKnowledgeDocumentDto {
  title: string;
  type: string;
  content?: string;
  url?: string;
  primaryKey?: string;
}

export interface SpreadsheetPreviewData {
  columns: string[];
  rows: Record<string, any>[];
  totalRows: number;
  primaryKey?: string;
}

let inMemoryKnowledge: KnowledgeDocument[] = [];

function determineCategory(type: string): KnowledgeCategory {
  const t = (type || '').toUpperCase();
  if (t === 'XLSX' || t === 'CSV' || t === 'SPREADSHEET') return 'structured';
  if (t === 'WEBSITE' || t === 'LIVE_SHEET' || t === 'GOOGLE_SHEETS') return 'live';
  return 'document';
}

export const knowledgeService = {
  list: async (): Promise<KnowledgeDocument[]> => {
    try {
      const res = await api.get('/knowledge');
      const raw = res.data || res;
      const items = Array.isArray(raw) ? raw : (raw.items || []);
      if (Array.isArray(items)) {
        return items.map((d: any) => {
          const rawType = (d.type || 'DOCUMENT').toUpperCase();
          const category = determineCategory(rawType);
          const meta = d.metadata || {};
          const rawCols = meta.columns || [];
          const columns = Array.isArray(rawCols)
            ? rawCols.map((c: any) => (typeof c === 'string' ? c : (c?.name || c?.key || c?.field || String(c || ''))))
            : [];

          return {
            id: d.id,
            title: d.name || d.title || (d.fileUrl ? d.fileUrl.split('/').pop() : '') || 'Untitled Document',
            type: rawType,
            category,
            status: d.status === 'READY' ? 'Active' : d.status === 'PROCESSING' ? 'Syncing' : 'Active',
            lastUpdated: d.updatedAt || d.createdAt || new Date().toISOString(),
            lastSynced: d.updatedAt || d.createdAt,
            rowCount: d.rowCount || meta.rowCount || 0,
            columns,
            primaryKey: meta.primaryKey,
            size: d.sizeBytes || 0,
            url: d.sourceUrl,
          };
        });
      }
      return inMemoryKnowledge;
    } catch {
      return inMemoryKnowledge;
    }
  },

  get: async (id: string): Promise<KnowledgeDocument> => {
    try {
      const data = await api.get(`/knowledge/${id}`);
      const d = data.data || data;
      return {
        id: d.id,
        title: d.name || d.title,
        type: (d.type || 'DOCUMENT').toUpperCase(),
        category: determineCategory(d.type),
        status: d.status === 'READY' ? 'Active' : 'Syncing',
        lastUpdated: d.updatedAt || new Date().toISOString(),
        lastSynced: d.updatedAt,
        rowCount: d.rowCount || 0,
        columns: d.metadata?.columns || [],
        primaryKey: d.metadata?.primaryKey,
        size: d.sizeBytes || 0
      };
    } catch {
      return inMemoryKnowledge.find(d => d.id === id) || inMemoryKnowledge[0];
    }
  },

  getRows: async (id: string, limit: number = 20): Promise<SpreadsheetPreviewData> => {
    try {
      const res = await api.get(`/knowledge/${id}/rows?limit=${limit}`);
      const data = res.data || res;
      const rows = Array.isArray(data.rows) ? data.rows : (Array.isArray(data) ? data : []);
      let columns = Array.isArray(data.columns) && data.columns.length > 0 ? data.columns : [];
      if (columns.length === 0 && rows.length > 0 && rows[0]) {
        columns = Object.keys(rows[0]);
      }
      return {
        columns,
        rows,
        totalRows: data.totalRows || rows.length || 0,
        primaryKey: data.primaryKey || (columns[0] || 'id')
      };
    } catch {
      return {
        columns: [],
        rows: [],
        totalRows: 0,
        primaryKey: 'id'
      };
    }
  },

  create: async (documentData: CreateKnowledgeDocumentDto, file?: File): Promise<KnowledgeDocument> => {
    if (file) {
      const formData = new FormData();
      formData.append('name', documentData.title);
      formData.append('title', documentData.title);
      formData.append('type', documentData.type);
      formData.append('file', file);
      if (documentData.primaryKey) {
        formData.append('primaryKey', documentData.primaryKey);
      }
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`http://localhost:4009/v1/knowledge`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Upload failed with status ${res.status}`);
      }
      const data = await res.json();
      const d = data.data || data;
      const meta = d.metadata || {};
      const newDoc: KnowledgeDocument = {
        id: d.id,
        title: d.name || d.title || documentData.title,
        type: (d.type || documentData.type).toUpperCase(),
        category: determineCategory(d.type || documentData.type),
        status: d.status === 'READY' ? 'Active' : 'Syncing',
        lastUpdated: d.updatedAt || new Date().toISOString(),
        lastSynced: d.updatedAt || new Date().toISOString(),
        rowCount: d.rowCount || meta.rowCount || 0,
        columns: meta.columns || [],
        primaryKey: meta.primaryKey || documentData.primaryKey,
        size: file.size,
      };
      return newDoc;
    } else {
      const res = await api.post('/knowledge', {
        name: documentData.title,
        title: documentData.title,
        type: documentData.type,
        primaryKey: documentData.primaryKey,
        content: documentData.content,
        url: documentData.url
      });
      const d = res.data || res;
      const meta = d.metadata || {};
      const newDoc: KnowledgeDocument = {
        id: d.id,
        title: d.name || d.title || documentData.title,
        type: (d.type || documentData.type).toUpperCase(),
        category: determineCategory(d.type || documentData.type),
        status: d.status === 'READY' ? 'Active' : d.status === 'PROCESSING' ? 'Syncing' : 'Active',
        lastUpdated: d.updatedAt || new Date().toISOString(),
        lastSynced: d.updatedAt || new Date().toISOString(),
        rowCount: d.rowCount || meta.rowCount || 0,
        columns: meta.columns || [],
        primaryKey: meta.primaryKey || documentData.primaryKey,
        url: d.sourceUrl || documentData.url,
        content: documentData.content
      };
      return newDoc;
    }
  },

  sync: async (id: string): Promise<void> => {
    try {
      await api.post(`/knowledge/${id}/sync`, {});
    } catch {
      // simulate sync
    }
  },

  update: async (id: string, updates: Partial<CreateKnowledgeDocumentDto>): Promise<KnowledgeDocument> => {
    try {
      await api.patch(`/knowledge/${id}`, updates);
    } catch {
      // Fallback
    }
    inMemoryKnowledge = inMemoryKnowledge.map(doc => doc.id === id ? { ...doc, ...updates } : doc);
    return inMemoryKnowledge.find(d => d.id === id)!;
  },

  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`/knowledge/${id}`);
    } catch {
      // Fallback
    }
    inMemoryKnowledge = inMemoryKnowledge.filter(d => d.id !== id);
  }
};
