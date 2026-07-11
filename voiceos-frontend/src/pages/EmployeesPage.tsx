import React from 'react';

export default function EmployeesPage() {
  return (
    <>
      {/* Page Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center mb-xxl gap-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">AI Workforce</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Manage and scale your autonomous voice workforce with precision.</p>
        </div>
        
        <button className="flex items-center gap-sm bg-primary text-on-primary px-lg py-md rounded-xl hover:bg-primary-container transition-all active:scale-95 shadow-sm">
          <span className="material-symbols-outlined">add</span>
          <span className="font-label-md text-label-md">Add Employee</span>
        </button>
      </section>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap gap-md mb-xl bg-white p-md rounded-xl border border-outline-variant">
        <div className="flex-1 min-w-[240px] relative">
          <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline">search</span>
          <input 
            className="w-full pl-[48px] h-10 bg-surface border-outline-variant rounded-lg focus:ring-primary focus:border-primary font-body-sm text-body-sm" 
            placeholder="Search employees by name, role or skill..." 
            type="text"
          />
        </div>
        <button className="flex items-center gap-xs px-md h-10 border border-outline-variant rounded-lg font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-container-low">
          <span className="material-symbols-outlined text-[18px]">filter_list</span>
          Status
        </button>
        <button className="flex items-center gap-xs px-md h-10 border border-outline-variant rounded-lg font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-container-low">
          <span className="material-symbols-outlined text-[18px]">language</span>
          Language
        </button>
      </div>

      {/* Employee Bento Grid */}
      <div className="bento-grid">
        {/* Employee Card 1 */}
        <article className="employee-card bg-white border border-outline-variant rounded-xl overflow-hidden hover:border-primary transition-all group flex flex-col">
          <div className="p-lg flex-1">
            <div className="flex justify-between items-start mb-lg">
              <div className="flex gap-md">
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-outline-variant">
                  <img className="w-full h-full object-cover" alt="Marcus" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDyk0Wg1D3vqi3rIJx6d_wKxYEg-uHdvolqZWiWR7K-RR3In94BZjYR1Afz5kDrGqRAwEEeFPHOWqILNKIWcGR2esl0kiBFrZTuyVYlbAfI8rCTbgzn-pt_gSoGZXEai-CPGSj0K9y90s4mGhDFWhoCNxQXXszAP4uwBfYYbQukwr-j49FX4ZeFokLiF-2S8a8F-Gajz87TbUg53mbIaHIdz0evb9JEqkvSpP804ujY0C-31HqctfPFwg"/>
                </div>
                <div>
                  <div className="flex items-center gap-sm mb-xs">
                    <h3 className="font-headline-md text-headline-md text-on-surface">Marcus</h3>
                    <span className="px-sm py-xs bg-secondary-container text-on-secondary-container text-[10px] uppercase tracking-wider font-bold rounded-lg">Active</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Billing & Payments</p>
                </div>
              </div>
              <div className="dot-pulse"></div>
            </div>
            
            <div className="space-y-md mb-lg">
              <div className="flex items-center gap-md">
                <span className="material-symbols-outlined text-outline text-[20px]">call</span>
                <span className="font-label-md text-label-md text-on-surface">+1 (555) 012-3456</span>
              </div>
              <div className="flex items-center gap-md">
                <span className="material-symbols-outlined text-outline text-[20px]">record_voice_over</span>
                <span className="font-label-md text-label-md text-on-surface">Calm, Professional</span>
              </div>
              <div className="flex items-center gap-md">
                <span className="material-symbols-outlined text-outline text-[20px]">translate</span>
                <span className="font-label-md text-label-md text-on-surface">24 languages supported</span>
              </div>
            </div>
            
            <div className="bg-surface-container-low rounded-lg p-md flex justify-between items-center">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Current Handles</span>
              <span className="font-headline-md text-headline-md text-primary font-bold">142</span>
            </div>
          </div>
          
          <div className="card-actions px-lg py-md bg-surface-container border-t border-outline-variant flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="flex items-center gap-xs font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[18px]">edit</span> Edit
            </button>
            <div className="flex gap-md">
              <button className="material-symbols-outlined text-on-surface-variant hover:text-primary p-xs rounded-lg transition-colors" title="Pause">pause_circle</button>
              <button className="material-symbols-outlined text-on-surface-variant hover:text-primary p-xs rounded-lg transition-colors" title="Duplicate">content_copy</button>
            </div>
          </div>
        </article>

        {/* Add New Placeholder */}
        <button className="border-2 border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center p-xxl hover:border-primary hover:bg-primary/5 transition-all group min-h-[340px]">
          <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center mb-md group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-on-surface-variant text-[32px]">add</span>
          </div>
          <h4 className="font-headline-md text-headline-md text-on-surface-variant">Hire AI Employee</h4>
          <p className="font-body-sm text-body-sm text-outline mt-xs">Select from templates or build custom</p>
        </button>
      </div>
    </>
  );
}


