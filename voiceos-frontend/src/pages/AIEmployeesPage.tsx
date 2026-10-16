import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { aiEmployeesService, INITIAL_AI_EMPLOYEES } from '../services/aiEmployees';
import type { AIEmployee } from '../services/aiEmployees';
import { PhoneDialerModal } from '../components/PhoneDialerModal';

export default function AIEmployeesPage() {
  const [employees, setEmployees] = useState<AIEmployee[]>(INITIAL_AI_EMPLOYEES);
  const [isDialerOpen, setIsDialerOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Idle' | 'Offline'>('ALL');
  const [languageFilter, setLanguageFilter] = useState<'ALL' | 'English (US)' | 'English (UK)' | 'Spanish (EN Accent)'>('ALL');

  // Edit Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<AIEmployee | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    role: '',
    voiceModel: 'Aria (US Female)',
    language: 'English (US)',
    status: 'Active' as 'Active' | 'Idle' | 'Offline',
    instructions: '',
    firstMessage: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Confirmation state
  const [deleteCandidate, setDeleteCandidate] = useState<AIEmployee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await aiEmployeesService.list();
        if (data && data.length > 0) {
          setEmployees(data);
        }
      } catch (err) {
        console.error("Failed to load AI employees", err);
      }
    };
    fetchEmployees();
  }, []);

  const handleOpenDialerForEmployee = (empId: string) => {
    setSelectedEmployeeId(empId);
    setIsDialerOpen(true);
  };

  const handleStartEdit = (emp: AIEmployee) => {
    setEditingEmployee(emp);
    setEditForm({
      name: emp.name,
      role: emp.role,
      voiceModel: emp.voiceModel,
      language: emp.language,
      status: emp.status,
      instructions: emp.systemPrompt || '',
      firstMessage: emp.firstMessage || `Hi! Thanks for reaching out. I'm ${emp.name}, your AI ${emp.role}. How can I assist you today?`,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingEmployee) return;
    setSavingEdit(true);
    try {
      const updated = await aiEmployeesService.update(editingEmployee.id, {
        name: editForm.name,
        role: editForm.role,
        voiceModel: editForm.voiceModel,
        language: editForm.language,
        status: editForm.status,
        instructions: editForm.instructions,
        firstMessage: editForm.firstMessage,
      });

      setEmployees(prev => prev.map(e => e.id === editingEmployee.id ? { ...e, ...updated } : e));
      setIsEditModalOpen(false);
      setEditingEmployee(null);
      showToast(`Employee "${editForm.name}" updated successfully.`);
    } catch (err: any) {
      console.error('Failed to update employee', err);
      showToast(`Error updating employee: ${err.message || 'Unknown error'}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    setIsDeleting(true);
    try {
      await aiEmployeesService.delete(deleteCandidate.id);
      setEmployees(prev => prev.filter(e => e.id !== deleteCandidate.id));
      showToast(`Employee "${deleteCandidate.name}" deleted.`);
      setDeleteCandidate(null);
    } catch (err: any) {
      console.error('Failed to delete employee', err);
      showToast(`Error deleting employee: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered employees list
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = searchTerm.trim() === '' ||
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.voiceModel.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || emp.status === statusFilter;
    const matchesLang = languageFilter === 'ALL' || emp.language === languageFilter;

    return matchesSearch && matchesStatus && matchesLang;
  });

  return (
    <>
      <div className="pt-xxxl pb-xxxl px-md md:px-xxl max-w-[1440px] mx-auto mt-xxl relative">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-20 right-8 z-50 bg-primary text-on-primary px-lg py-md rounded-xl shadow-lg flex items-center gap-sm animate-bounce">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span className="font-label-md text-label-md font-bold">{toastMessage}</span>
          </div>
        )}

        {/* Page Header */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-center mb-xxl gap-md animate-entrance">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">AI Workforce</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Manage and scale your autonomous voice workforce with precision.</p>
          </div>
          <div className="flex gap-sm">
            <button 
              onClick={() => { setSelectedEmployeeId(''); setIsDialerOpen(true); }}
              className="flex items-center gap-sm bg-surface border border-outline-variant text-on-surface px-lg py-md rounded-xl hover:bg-surface-container interactive-element btn-active-state shadow-xs"
            >
              <span className="material-symbols-outlined text-[20px]">call</span>
              <span className="font-label-md text-label-md font-bold">Make Call</span>
            </button>
            <Link to="/create-employee" className="flex items-center gap-sm bg-primary text-on-primary px-lg py-md rounded-xl hover:bg-primary-container interactive-element btn-active-state shadow-sm">
              <span className="material-symbols-outlined">add</span>
              <span className="font-label-md text-label-md font-bold">Add Employee</span>
            </Link>
          </div>
        </section>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap gap-md mb-xl bg-white p-md rounded-xl border border-outline-variant animate-entrance delay-1">
          <div className="flex-1 min-w-[240px] relative group">
            <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary interactive-element">search</span>
            <input 
              className="w-full pl-[48px] h-10 bg-surface border-outline-variant rounded-lg focus:ring-primary focus:border-primary font-body-sm text-body-sm interactive-element" 
              placeholder="Search employees by name, role or voice..." 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-xs">
            <span className="material-symbols-outlined text-outline text-[18px]">filter_list</span>
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="h-10 px-md border border-outline-variant rounded-lg font-label-sm text-label-sm text-on-surface-variant bg-surface hover:bg-surface-container-low interactive-element cursor-pointer"
            >
              <option value="ALL">Status: All</option>
              <option value="Active">Active</option>
              <option value="Idle">Idle</option>
              <option value="Offline">Offline</option>
            </select>
          </div>

          {/* Language Filter */}
          <div className="flex items-center gap-xs">
            <span className="material-symbols-outlined text-outline text-[18px]">language</span>
            <select
              value={languageFilter}
              onChange={(e: any) => setLanguageFilter(e.target.value)}
              className="h-10 px-md border border-outline-variant rounded-lg font-label-sm text-label-sm text-on-surface-variant bg-surface hover:bg-surface-container-low interactive-element cursor-pointer"
            >
              <option value="ALL">Language: All</option>
              <option value="English (US)">English (US)</option>
              <option value="English (UK)">English (UK)</option>
              <option value="Spanish (EN Accent)">Spanish (EN Accent)</option>
            </select>
          </div>
        </div>

        {/* Employee Bento Grid */}
        <div className="bento-grid">
          {filteredEmployees.length === 0 ? (
            <div className="col-span-full text-center py-xl bg-white border border-outline-variant rounded-xl text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] text-outline mb-sm block">person_search</span>
              <p className="font-headline-md text-headline-md mb-xs">No employees found</p>
              <p className="font-body-sm text-body-sm">Try clearing your filters or search keywords.</p>
            </div>
          ) : (
            filteredEmployees.map((employee: AIEmployee, index: number) => (
              <article key={employee.id} className={`employee-card bg-white border border-outline-variant rounded-xl overflow-hidden group flex flex-col animate-entrance delay-${(index % 4) + 1} shadow-xs hover:shadow-md transition-shadow`}>
                <div className="p-lg flex-1">
                  <div className="flex justify-between items-start mb-lg">
                    <div className="flex gap-md">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-outline-variant bg-surface-container-low flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-[32px]">smart_toy</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-sm mb-xs">
                          <h3 className="font-headline-md text-headline-md text-on-surface font-bold">{employee.name}</h3>
                          <span className={`px-sm py-xs text-[10px] uppercase tracking-wider font-bold rounded-lg ${employee.status === 'Active' ? 'bg-secondary-container text-on-secondary-container' : employee.status === 'Idle' ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-surface-container-highest text-on-surface-variant'}`}>{employee.status}</span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">{employee.role}</p>
                      </div>
                    </div>
                    {employee.status === 'Active' && <div className="dot-pulse"></div>}
                  </div>

                  <div className="space-y-md mb-lg">
                    <div className="flex items-center gap-md">
                      <span className="material-symbols-outlined text-outline text-[20px]">mic</span>
                      <span className="font-label-md text-label-md text-on-surface">{employee.voiceModel}</span>
                    </div>
                    <div className="flex items-center gap-md">
                      <span className="material-symbols-outlined text-outline text-[20px]">translate</span>
                      <span className="font-label-md text-label-md text-on-surface">{employee.language}</span>
                    </div>
                  </div>

                  <div className="bg-surface-container-low rounded-lg p-md flex justify-between items-center group-hover:bg-surface-container interactive-element">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Total Calls Handled</span>
                    <span className="font-headline-md text-headline-md text-primary font-bold">{employee.callsHandled}</span>
                  </div>
                </div>

                <div className="card-actions px-lg py-md bg-surface-container border-t border-outline-variant flex justify-between items-center">
                  <button 
                    onClick={() => handleOpenDialerForEmployee(employee.id)}
                    className="flex items-center gap-xs px-md py-xs bg-primary text-on-primary rounded-lg font-label-sm text-label-sm font-bold hover:brightness-110 interactive-element btn-active-state shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">call</span> Place Call
                  </button>
                  <div className="flex gap-xs items-center">
                    <button 
                      onClick={() => handleStartEdit(employee)}
                      className="flex items-center gap-xs p-xs font-label-sm text-label-sm text-on-surface-variant hover:text-primary hover:bg-surface-container-highest rounded-lg interactive-element btn-active-state transition-colors"
                      title="Edit Employee"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button 
                      onClick={() => setDeleteCandidate(employee)}
                      className="material-symbols-outlined text-error hover:text-red-700 hover:bg-red-50 p-xs rounded-lg interactive-element btn-active-state transition-colors" 
                      title="Delete Employee"
                    >
                      delete
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}

          {/* Add New Placeholder Card */}
          <Link to="/create-employee" className="employee-card border-2 border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center p-xxl hover:border-primary hover:bg-primary/5 group min-h-[340px] interactive-element btn-active-state animate-entrance delay-4">
            <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center mb-md group-hover:scale-110 group-hover:bg-primary/10 interactive-element">
              <span className="material-symbols-outlined text-on-surface-variant text-[32px] group-hover:text-primary interactive-element">add</span>
            </div>
            <h4 className="font-headline-md text-headline-md text-on-surface-variant group-hover:text-primary interactive-element">Hire AI Employee</h4>
            <p className="font-body-sm text-body-sm text-outline mt-xs">Select from templates or build custom</p>
          </Link>
        </div>

        {/* EDIT EMPLOYEE MODAL */}
        {isEditModalOpen && editingEmployee && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-hidden animate-fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-outline-variant shadow-2xl animate-scale-up">
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b border-outline-variant shrink-0 bg-white rounded-t-2xl">
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-primary text-[28px]">edit</span>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Edit AI Employee</h3>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="material-symbols-outlined text-outline hover:text-on-surface p-xs rounded-lg hover:bg-surface-container transition-colors"
                >
                  close
                </button>
              </div>

              {/* Modal Scrollable Body */}
              <div className="p-6 overflow-y-auto space-y-md flex-1 overscroll-contain">
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs font-semibold">Employee Name</label>
                  <input 
                    type="text" 
                    value={editForm.name} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-md h-10 border border-outline-variant rounded-lg font-body-sm focus:ring-2 focus:ring-primary bg-surface"
                  />
                </div>

                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs font-semibold">Role Title</label>
                  <input 
                    type="text" 
                    value={editForm.role} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-md h-10 border border-outline-variant rounded-lg font-body-sm focus:ring-2 focus:ring-primary bg-surface"
                  />
                </div>

                <div className="grid grid-cols-2 gap-md">
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs font-semibold">Voice Profile</label>
                    <select
                      value={editForm.voiceModel}
                      onChange={(e) => setEditForm(prev => ({ ...prev, voiceModel: e.target.value }))}
                      className="w-full px-md h-10 border border-outline-variant rounded-lg font-body-sm bg-surface"
                    >
                      <option value="en-US-JennyNeural (US Female)">Jenny (US Female)</option>
                      <option value="en-US-GuyNeural (US Male)">Guy (US Male)</option>
                      <option value="en-US-AriaNeural (US Female)">Aria (US Female)</option>
                      <option value="en-GB-SoniaNeural (UK Female)">Sonia (UK Female)</option>
                      <option value="en-IN-NeerjaNeural (IN Female)">Neerja (IN Female)</option>
                      <option value="en-IN-PrabhatNeural (IN Male)">Prabhat (IN Male)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs font-semibold">Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e: any) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-md h-10 border border-outline-variant rounded-lg font-body-sm bg-surface"
                    >
                      <option value="Active">Active</option>
                      <option value="Idle">Idle</option>
                      <option value="Offline">Offline</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs font-semibold">Opening Spoken Greeting (First Message)</label>
                  <textarea 
                    rows={2}
                    value={editForm.firstMessage} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, firstMessage: e.target.value }))}
                    className="w-full p-md border border-outline-variant rounded-lg font-body-sm focus:ring-2 focus:ring-primary bg-surface"
                    placeholder="e.g. Hi! Thanks for reaching out. I'm Yuvaraj, your AI Sales Development Representative. How can I assist you today?"
                  />
                  <p className="text-[11px] text-on-surface-variant mt-1">This is the exact spoken phrase the AI says as soon as the caller answers the phone.</p>
                </div>

                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs font-semibold">System Instructions &amp; LLM Rules</label>
                  <textarea 
                    rows={5}
                    value={editForm.instructions} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, instructions: e.target.value }))}
                    className="w-full p-md border border-outline-variant rounded-lg font-body-sm focus:ring-2 focus:ring-primary bg-surface"
                    placeholder="Provide persona, rules, handling guidelines, and knowledge constraints for the AI..."
                  />
                  <p className="text-[11px] text-on-surface-variant mt-1">Background prompt that defines AI persona, product knowledge, and conversation boundaries.</p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-sm p-4 px-6 border-t border-outline-variant bg-surface shrink-0 rounded-b-2xl">
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-lg py-sm border border-outline-variant rounded-xl font-label-md hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="px-lg py-sm bg-primary text-on-primary rounded-xl font-label-md font-bold hover:brightness-110 flex items-center gap-xs shadow-sm"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deleteCandidate && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-md animate-fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-xl border border-outline-variant shadow-2xl">
              <div className="flex items-center gap-sm text-error mb-md">
                <span className="material-symbols-outlined text-[32px]">warning</span>
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Delete AI Employee</h3>
              </div>
              <p className="font-body-md text-on-surface-variant mb-xl">
                Are you sure you want to delete <strong className="text-on-surface">{deleteCandidate.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-sm">
                <button 
                  onClick={() => setDeleteCandidate(null)}
                  disabled={isDeleting}
                  className="px-lg py-sm border border-outline-variant rounded-xl font-label-md hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-lg py-sm bg-error text-white rounded-xl font-label-md font-bold hover:bg-red-700 flex items-center gap-xs"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        <PhoneDialerModal 
          isOpen={isDialerOpen} 
          onClose={() => setIsDialerOpen(false)} 
          preselectedEmployeeId={selectedEmployeeId} 
        />
      </div>
    </>
  );
}
