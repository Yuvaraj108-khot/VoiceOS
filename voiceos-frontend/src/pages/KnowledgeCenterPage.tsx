import { useState, useEffect } from 'react';
import { knowledgeService } from '../services/knowledge';
import type { KnowledgeDocument, SpreadsheetPreviewData, KnowledgeCategory } from '../services/knowledge';

export default function KnowledgeCenterPage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab & Filter state
  const [activeTab, setActiveTab] = useState<'ALL' | KnowledgeCategory>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical' | 'rows'>('newest');

  // Add Source Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'upload' | 'website' | 'live_sheet' | 'text'>('upload');
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('XLSX');
  const [newContent, setNewContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [primaryKeyChoice, setPrimaryKeyChoice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation state
  const [deleteCandidate, setDeleteCandidate] = useState<KnowledgeDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Spreadsheet Preview Modal state
  const [previewDoc, setPreviewDoc] = useState<KnowledgeDocument | null>(null);
  const [previewData, setPreviewData] = useState<SpreadsheetPreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Syncing state
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchDocuments = async () => {
    try {
      const data = await knowledgeService.list();
      setDocuments(data);
    } catch (error) {
      console.error("Failed to load knowledge documents", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!newTitle) {
        setNewTitle(file.name);
      }
      const ext = file.name.split('.').pop()?.toUpperCase() || '';
      if (['XLSX', 'XLS', 'CSV'].includes(ext)) {
        setNewType(ext === 'CSV' ? 'CSV' : 'XLSX');
      } else if (ext === 'PDF') {
        setNewType('PDF');
      } else if (['DOC', 'DOCX'].includes(ext)) {
        setNewType('DOCX');
      } else if (['PPT', 'PPTX'].includes(ext)) {
        setNewType('PPTX');
      } else {
        setNewType('TXT');
      }
    }
  };

  const handleCreateSource = async () => {
    if (!newTitle.trim()) {
      showToast('Please provide a title for the source');
      return;
    }

    setIsSubmitting(true);
    try {
      let docType = newType;
      if (modalMode === 'website') docType = 'WEBSITE';
      if (modalMode === 'live_sheet') docType = 'SPREADSHEET';
      if (modalMode === 'text') docType = 'DOCUMENT';

      const created = await knowledgeService.create({
        title: newTitle.trim(),
        type: docType,
        content: newContent,
        url: (modalMode === 'website' || modalMode === 'live_sheet') ? newContent : undefined,
        primaryKey: primaryKeyChoice || undefined
      }, selectedFile || undefined);

      setDocuments(prev => [created, ...prev]);
      setIsAddModalOpen(false);
      resetModalForm();
      showToast(`Source "${created.title}" added and indexed.`);
      await fetchDocuments();
    } catch (err: any) {
      showToast(`Error adding source: ${err.message || 'Unknown'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetModalForm = () => {
    setNewTitle('');
    setNewType('XLSX');
    setNewContent('');
    setSelectedFile(null);
    setPrimaryKeyChoice('');
    setModalMode('upload');
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    setIsDeleting(true);
    try {
      await knowledgeService.delete(deleteCandidate.id);
      setDocuments(prev => prev.filter(d => d.id !== deleteCandidate.id));
      showToast(`Source "${deleteCandidate.title}" deleted.`);
      setDeleteCandidate(null);
    } catch (err: any) {
      showToast(`Error deleting: ${err.message || 'Unknown'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSyncSource = async (doc: KnowledgeDocument) => {
    setSyncingId(doc.id);
    try {
      await knowledgeService.sync(doc.id);
      showToast(`Synced ${doc.title} data source successfully.`);
      await fetchDocuments();
    } catch (err: any) {
      showToast(`Sync failed: ${err.message || 'Error'}`);
    } finally {
      setSyncingId(null);
    }
  };

  const handleOpenPreview = async (doc: KnowledgeDocument) => {
    setPreviewDoc(doc);
    setLoadingPreview(true);
    try {
      const data = await knowledgeService.getRows(doc.id);
      setPreviewData(data);
    } catch (err) {
      console.error("Preview load error", err);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Filter & Sort
  const filteredDocuments = documents
    .filter(doc => {
      if (!doc) return false;
      const titleStr = (doc.title || '').toLowerCase();
      const searchStr = searchTerm.trim().toLowerCase();
      const matchesSearch = searchStr === '' ||
        titleStr.includes(searchStr) ||
        (Array.isArray(doc.columns) && doc.columns.some(col => String(col || '').toLowerCase().includes(searchStr)));
      const matchesCategory = activeTab === 'ALL' || doc.category === activeTab;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime();
      if (sortBy === 'oldest') return new Date(a.lastUpdated || 0).getTime() - new Date(b.lastUpdated || 0).getTime();
      if (sortBy === 'alphabetical') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'rows') return (b.rowCount || 0) - (a.rowCount || 0);
      return 0;
    });

  const getFormatIcon = (type: string) => {
    const t = (type || '').toUpperCase();
    if (t === 'PDF') return { icon: 'picture_as_pdf', color: 'text-red-500 bg-red-50' };
    if (t === 'XLSX' || t === 'CSV' || t === 'SPREADSHEET') return { icon: 'table_view', color: 'text-emerald-600 bg-emerald-50' };
    if (t === 'PPTX' || t === 'PPT') return { icon: 'slideshow', color: 'text-amber-500 bg-amber-50' };
    if (t === 'DOCX' || t === 'DOC') return { icon: 'description', color: 'text-blue-500 bg-blue-50' };
    if (t === 'WEBSITE') return { icon: 'language', color: 'text-indigo-500 bg-indigo-50' };
    return { icon: 'article', color: 'text-gray-500 bg-gray-50' };
  };

  return (
    <>
      <div className="pt-8 px-4 md:px-8 max-w-[1440px] mx-auto relative pb-20">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-20 right-8 z-50 bg-primary text-on-primary px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-fade-in border border-primary/20">
            <span className="material-symbols-outlined text-[22px]">check_circle</span>
            <span className="font-semibold text-sm">{toastMessage}</span>
          </div>
        )}

        {/* Dashboard Header Area */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                Universal Business Intelligence
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Zero-Hallucination Exact Lookup
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Knowledge & Business Data Center</h1>
            <p className="text-sm text-on-surface-variant max-w-2xl mt-1">
              Provide static company manuals for voice RAG, and connect Excel, CSV, or live spreadsheets for exact real-time phone queries without hallucinating order status or customer details.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              className="bg-primary hover:bg-primary/95 text-on-primary font-semibold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95 text-sm"
              onClick={() => { resetModalForm(); setIsAddModalOpen(true); }}
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Add Knowledge Source
            </button>
          </div>
        </section>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-surface border border-outline-variant/60 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Active Knowledge Sources</p>
                <p className="text-2xl font-black text-on-surface mt-1">{documents.length} Connected</p>
              </div>
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[24px]">folder_special</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-on-surface-variant pt-2 border-t border-outline-variant/40">
              <span className="flex items-center gap-1">
                <strong className="text-primary">{documents.filter(d => d.category === 'structured').length}</strong> Structured (Excel/CSV)
              </span>
              <span className="flex items-center gap-1">
                <strong className="text-blue-600">{documents.filter(d => d.category === 'document').length}</strong> Documents (RAG)
              </span>
            </div>
          </div>

          <div className="bg-surface border border-outline-variant/60 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Total Indexed Business Rows</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">
                  {documents.reduce((acc, d) => acc + (d.rowCount || 0), 0).toLocaleString()} Rows
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <span className="material-symbols-outlined text-[24px]">dataset</span>
              </div>
            </div>
            <p className="text-xs text-on-surface-variant pt-2 border-t border-outline-variant/40">
              Sub-10ms exact index lookup across orders, accounts, and inventory.
            </p>
          </div>

          <div className="bg-surface border border-outline-variant/60 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Routing Strategy</p>
                <p className="text-base font-bold text-on-surface mt-1">Intelligent Dual-Engine</p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
                <span className="material-symbols-outlined text-[24px]">schema</span>
              </div>
            </div>
            <div className="text-xs text-on-surface-variant space-y-1 pt-2 border-t border-outline-variant/40">
              <div className="flex items-center justify-between">
                <span>Company Policies/Docs</span>
                <span className="font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded text-[11px]">pgvector RAG</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Orders/Live Data</span>
                <span className="font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">Exact Tool Lookup</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-outline-variant/60 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'ALL'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">apps</span>
              All Sources ({documents.length})
            </button>
            <button
              onClick={() => setActiveTab('structured')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'structured'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">table_chart</span>
              Structured Data ({documents.filter(d => d.category === 'structured').length})
            </button>
            <button
              onClick={() => setActiveTab('document')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'document'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">description</span>
              Documents ({documents.filter(d => d.category === 'document').length})
            </button>
            <button
              onClick={() => setActiveTab('live')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'live'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">rss_feed</span>
              Live Sources ({documents.filter(d => d.category === 'live').length})
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative min-w-[260px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
              <input 
                className="w-full pl-9 pr-3 h-10 bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-xs" 
                placeholder="Filter by title or column name..." 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="h-10 px-3 border border-outline-variant rounded-xl text-xs font-medium text-on-surface-variant bg-surface hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="alphabetical">Sort: A-Z</option>
              <option value="rows">Sort: Row Count</option>
            </select>
          </div>
        </div>

        {/* Knowledge Sources Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {loading ? (
            <div className="col-span-full text-center py-16 text-on-surface-variant text-sm font-medium">
              Loading Universal Knowledge Base...
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-surface border border-outline-variant rounded-2xl p-8">
              <span className="material-symbols-outlined text-[48px] text-outline mb-2 block">folder_off</span>
              <h3 className="text-base font-bold text-on-surface">No sources found in this view</h3>
              <p className="text-xs text-on-surface-variant mt-1">Upload a business spreadsheet or document to empower your AI callers.</p>
              <button
                onClick={() => { resetModalForm(); setIsAddModalOpen(true); }}
                className="mt-4 px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-semibold hover:brightness-110"
              >
                + Add Source Now
              </button>
            </div>
          ) : (
            filteredDocuments.map(doc => {
              const format = getFormatIcon(doc.type);
              const isStructured = doc.category === 'structured' || doc.type === 'XLSX' || doc.type === 'CSV';

              return (
                <div 
                  key={doc.id} 
                  className="bg-surface border border-outline-variant/70 rounded-2xl p-5 transition-all flex flex-col justify-between hover:shadow-md hover:border-primary/40 relative group"
                >
                  <div>
                    {/* Top Row: Format & Status */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl flex items-center justify-center ${format.color}`}>
                          <span className="material-symbols-outlined text-[24px]">{format.icon}</span>
                        </div>
                        <div>
                          <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded bg-surface-container-highest text-on-surface-variant tracking-wider">
                            {doc.type}
                          </span>
                          {doc.category === 'structured' && (
                            <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              EXACT LOOKUP
                            </span>
                          )}
                          {doc.category === 'document' && (
                            <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              RAG VECTOR
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${doc.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`}></span>
                        <span className="text-xs font-medium text-on-surface-variant">{doc.status}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-base text-on-surface truncate mb-1" title={doc.title}>
                      {doc.title}
                    </h3>

                    {/* Metadata Subtitle */}
                    <p className="text-xs text-on-surface-variant flex items-center gap-2 mb-3">
                      <span>Updated {new Date(doc.lastUpdated).toLocaleDateString()}</span>
                      {doc.size && <span>• {(doc.size / 1024 / (doc.size > 1048576 ? 1024 : 1)).toFixed(1)} {doc.size > 1048576 ? 'MB' : 'KB'}</span>}
                    </p>

                    {/* Tabular Specific Info */}
                    {isStructured && (
                      <div className="bg-surface-container-low rounded-xl p-3 mb-4 border border-outline-variant/40 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-on-surface-variant font-medium">Record Count:</span>
                          <span className="font-bold text-on-surface">{(doc.rowCount || 0).toLocaleString()} rows</span>
                        </div>
                        {doc.primaryKey && (
                          <div className="flex items-center justify-between">
                            <span className="text-on-surface-variant font-medium">Primary Key:</span>
                            <span className="font-mono text-[11px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded">
                              {doc.primaryKey}
                            </span>
                          </div>
                        )}
                        {doc.columns && doc.columns.length > 0 && (
                          <div className="pt-1">
                            <span className="text-[11px] text-on-surface-variant block mb-1">Detected Columns ({doc.columns.length}):</span>
                            <div className="flex flex-wrap gap-1">
                              {doc.columns.slice(0, 4).map((col, cIdx) => {
                                const colName = typeof col === 'string' ? col : ((col as any)?.name || (col as any)?.key || String(col || ''));
                                return (
                                  <span key={cIdx} className="text-[10px] bg-surface border border-outline-variant/60 rounded px-1.5 py-0.5 font-mono text-on-surface-variant">
                                    {colName}
                                  </span>
                                );
                              })}
                              {doc.columns.length > 4 && (
                                <span className="text-[10px] text-on-surface-variant">+{doc.columns.length - 4} more</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-outline-variant/50 flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2">
                      {isStructured && (
                        <button
                          onClick={() => handleOpenPreview(doc)}
                          className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface flex items-center gap-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px] text-primary">visibility</span>
                          Preview Data
                        </button>
                      )}
                      <button
                        onClick={() => handleSyncSource(doc)}
                        disabled={syncingId === doc.id}
                        className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface flex items-center gap-1 transition-colors disabled:opacity-50"
                        title="Re-sync and refresh data records"
                      >
                        <span className={`material-symbols-outlined text-[16px] ${syncingId === doc.id ? 'animate-spin' : ''}`}>
                          sync
                        </span>
                        Sync
                      </button>
                    </div>

                    <button
                      onClick={() => setDeleteCandidate(doc)}
                      className="p-1.5 text-outline hover:text-error hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Source"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* Add Source CTA Card */}
          <button 
            className="border-2 border-dashed border-outline-variant/80 hover:border-primary rounded-2xl p-6 flex flex-col items-center justify-center text-on-surface-variant hover:bg-primary/5 transition-all group min-h-[220px]" 
            onClick={() => { resetModalForm(); setIsAddModalOpen(true); }}
          >
            <div className="p-3.5 rounded-2xl bg-surface-container-highest group-hover:bg-primary/10 text-primary mb-3 transition-colors">
              <span className="material-symbols-outlined text-[36px]">cloud_upload</span>
            </div>
            <p className="font-bold text-sm text-on-surface">Add New Business Source</p>
            <p className="text-xs text-on-surface-variant mt-1 text-center max-w-[220px]">
              Excel (.xlsx), CSV, PDF, Word (.docx), PowerPoint (.pptx), or Live Sheet
            </p>
          </button>
        </div>

        {/* SPREADSHEET PREVIEW MODAL */}
        {previewDoc && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-surface rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-outline-variant shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
                    <span className="material-symbols-outlined text-[24px]">table_chart</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-on-surface flex items-center gap-2">
                      {previewDoc.title}
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Structured Tabular
                      </span>
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      Rows: <strong className="text-on-surface">{(previewData?.totalRows || previewDoc.rowCount || 0).toLocaleString()}</strong> • 
                      Columns: <strong className="text-on-surface">{(previewData?.columns?.length || previewDoc.columns?.length || 0)}</strong> •
                      Primary Key: <strong className="text-primary font-mono">{previewData?.primaryKey || previewDoc.primaryKey || 'Auto-Detected'}</strong>
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => { setPreviewDoc(null); setPreviewData(null); }}
                  className="material-symbols-outlined text-outline hover:text-on-surface p-2 rounded-xl hover:bg-surface-container"
                >
                  close
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">verified_user</span>
                    <div>
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Zero-Hallucination Schema Guard</h4>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        During live customer calls, VoiceOS queries this table using exact matching on the primary identifier (e.g. <span className="font-mono font-semibold">order_id</span>). If a caller asks for an order ID not in this table, the AI will explicitly state it is not found without hallucinating.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                    Live Record Preview (Sample rows)
                  </h4>
                  {(() => {
                    const activeRows = (previewData?.rows && previewData.rows.length > 0)
                      ? previewData.rows
                      : [];

                    const activeCols = (previewData?.columns && previewData.columns.length > 0)
                      ? previewData.columns.map((c: any) => typeof c === 'string' ? c : (c?.name || c?.key || String(c || '')))
                      : (previewDoc?.columns && previewDoc.columns.length > 0)
                        ? previewDoc.columns.map((c: any) => typeof c === 'string' ? c : (c?.name || c?.key || String(c || '')))
                        : (activeRows.length > 0 ? Object.keys(activeRows[0] || {}) : []);

                    return loadingPreview ? (
                      <div className="py-12 text-center text-xs text-on-surface-variant font-medium">
                        Loading spreadsheet records...
                      </div>
                    ) : (
                      <div className="border border-outline-variant/60 rounded-xl overflow-x-auto shadow-xs">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-surface-container-high border-b border-outline-variant/60">
                              {activeCols.map((col, idx) => (
                                <th key={idx} className="p-3 font-mono font-bold text-on-surface tracking-wider uppercase text-[11px] whitespace-nowrap">
                                  {col}
                                  {col === (previewData?.primaryKey || previewDoc?.primaryKey) && (
                                    <span className="ml-1.5 text-[9px] bg-primary text-on-primary px-1.5 py-0.5 rounded font-sans font-semibold">
                                      KEY
                                    </span>
                                  )}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/40 font-medium">
                            {activeRows.length === 0 ? (
                              <tr>
                                <td colSpan={Math.max(activeCols.length, 1)} className="p-6 text-center text-on-surface-variant font-medium text-xs">
                                  No rows available to preview in this document.
                                </td>
                              </tr>
                            ) : (
                              activeRows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-surface-container-low transition-colors">
                                  {activeCols.map((col, cIdx) => (
                                    <td key={cIdx} className="p-3 text-on-surface whitespace-nowrap">
                                      {row[col] !== undefined && row[col] !== null ? String(row[col]) : '-'}
                                    </td>
                                  ))}
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="p-4 border-t border-outline-variant flex justify-end gap-3 bg-surface-container-low">
                <button
                  onClick={() => { setPreviewDoc(null); setPreviewData(null); }}
                  className="px-5 py-2 bg-primary text-on-primary rounded-xl text-xs font-semibold hover:brightness-110"
                >
                  Done Previewing
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ADD SOURCE MODAL */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-surface rounded-2xl max-w-xl w-full p-6 border border-outline-variant shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-outline-variant/60">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-[26px]">add_circle</span>
                  <h3 className="font-bold text-lg text-on-surface">Add Knowledge Source</h3>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="material-symbols-outlined text-outline hover:text-on-surface p-1 rounded-lg"
                >
                  close
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 p-1 bg-surface-container-high rounded-xl mb-5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setModalMode('upload')}
                  className={`py-2 px-1 rounded-lg transition-all text-center flex flex-col items-center gap-1 ${
                    modalMode === 'upload' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">upload_file</span>
                  <span>Upload File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode('live_sheet')}
                  className={`py-2 px-1 rounded-lg transition-all text-center flex flex-col items-center gap-1 ${
                    modalMode === 'live_sheet' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">table_view</span>
                  <span>Live Sheet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode('website')}
                  className={`py-2 px-1 rounded-lg transition-all text-center flex flex-col items-center gap-1 ${
                    modalMode === 'website' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">language</span>
                  <span>Website URL</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode('text')}
                  className={`py-2 px-1 rounded-lg transition-all text-center flex flex-col items-center gap-1 ${
                    modalMode === 'text' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">notes</span>
                  <span>Text / FAQ</span>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Source Name / Identifier</label>
                  <input 
                    type="text" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Orders 2026, Return Policy, Customer Records"
                    className="w-full px-3.5 h-10 border border-outline-variant rounded-xl text-xs focus:ring-2 focus:ring-primary bg-surface"
                  />
                </div>

                {modalMode === 'upload' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1">Select Business File</label>
                      <div className="border-2 border-dashed border-outline-variant rounded-xl p-5 text-center hover:bg-surface-container-low transition-colors cursor-pointer relative">
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv,.pdf,.docx,.doc,.pptx,.ppt,.txt"
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <div className="flex flex-col items-center">
                          <span className="material-symbols-outlined text-primary text-[36px] mb-1">cloud_upload</span>
                          <p className="text-xs font-bold text-on-surface">
                            {selectedFile ? selectedFile.name : 'Click or drag file here'}
                          </p>
                          <p className="text-[11px] text-on-surface-variant mt-0.5">
                            Supported: XLSX, CSV, PDF, DOCX, PPTX, TXT
                          </p>
                        </div>
                      </div>
                    </div>

                    {(newType === 'XLSX' || newType === 'CSV') && (
                      <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/60 text-xs">
                        <label className="block font-semibold text-on-surface mb-1">
                          Primary Identifier Column (Optional)
                        </label>
                        <p className="text-[11px] text-on-surface-variant mb-2">
                          Auto-detected if left blank (e.g. <span className="font-mono">order_id</span>, <span className="font-mono">id</span>).
                        </p>
                        <input
                          type="text"
                          value={primaryKeyChoice}
                          onChange={(e) => setPrimaryKeyChoice(e.target.value)}
                          placeholder="e.g. order_id, tracking_number, customer_id"
                          className="w-full px-3 h-8 border border-outline-variant rounded-lg text-xs bg-surface font-mono"
                        />
                      </div>
                    )}
                  </div>
                )}

                {modalMode === 'live_sheet' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-on-surface-variant mb-1">Google Sheets Public or API URL</label>
                      <input 
                        type="url"
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                        className="w-full px-3.5 h-10 border border-outline-variant rounded-xl text-xs focus:ring-2 focus:ring-primary bg-surface"
                      />
                    </div>
                  </div>
                )}

                {modalMode === 'website' && (
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">Website URL for Scraping</label>
                    <input 
                      type="url"
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="https://docs.yourcompany.com"
                      className="w-full px-3.5 h-10 border border-outline-variant rounded-xl text-xs focus:ring-2 focus:ring-primary bg-surface"
                    />
                  </div>
                )}

                {modalMode === 'text' && (
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">Company Knowledge Text</label>
                    <textarea 
                      rows={5}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Paste return policies, delivery schedules, FAQ items..."
                      className="w-full p-3 border border-outline-variant rounded-xl text-xs focus:ring-2 focus:ring-primary bg-surface"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-outline-variant/60">
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-outline-variant rounded-xl text-xs font-semibold hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateSource}
                  disabled={isSubmitting || !newTitle.trim()}
                  className="px-5 py-2 bg-primary text-on-primary rounded-xl text-xs font-semibold hover:brightness-110 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Add Source</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deleteCandidate && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-surface rounded-2xl max-w-md w-full p-6 border border-outline-variant shadow-2xl">
              <div className="flex items-center gap-2.5 text-error mb-3">
                <span className="material-symbols-outlined text-[28px]">warning</span>
                <h3 className="font-bold text-base text-on-surface">Delete Knowledge Source</h3>
              </div>
              <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
                Are you sure you want to delete <strong className="text-on-surface">{deleteCandidate.title}</strong>? VoiceOS AI employees will immediately lose access to these records and documents during customer calls.
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setDeleteCandidate(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 border border-outline-variant rounded-xl text-xs font-semibold hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-5 py-2 bg-error text-white rounded-xl text-xs font-semibold hover:bg-red-700 flex items-center gap-1.5"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
