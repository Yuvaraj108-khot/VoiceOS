import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { aiEmployeesService } from '../services/aiEmployees';
import type { AIEmployee } from '../services/aiEmployees';
export default function AIEmployeesPage() {
  const [employees, setEmployees] = useState<AIEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await aiEmployeesService.list();
        setEmployees(data);
      } catch (err) {
        console.error("Failed to load AI employees", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  return (
    <>
<div className="pt-xxxl pb-xxxl px-md md:px-xxl max-w-[1440px] mx-auto mt-xxl">
{/* Page Header */}
<section className="flex flex-col md:flex-row justify-between items-start md:items-center mb-xxl gap-md animate-entrance">
<div>
<h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">AI Workforce</h1>
<p className="font-body-md text-body-md text-on-surface-variant">Manage and scale your autonomous voice workforce with precision.</p>
</div>
<Link to="/create-employee" className="flex items-center gap-sm bg-primary text-on-primary px-lg py-md rounded-xl hover:bg-primary-container interactive-element btn-active-state shadow-sm">
<span className="material-symbols-outlined">add</span>
<span className="font-label-md text-label-md">Add Employee</span>
</Link>
</section>
{/* Search & Filter Bar */}
<div className="flex flex-wrap gap-md mb-xl bg-white p-md rounded-xl border border-outline-variant animate-entrance delay-1">
<div className="flex-1 min-w-[240px] relative group">
<span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary interactive-element">search</span>
<input className="w-full pl-[48px] h-10 bg-surface border-outline-variant rounded-lg focus:ring-primary focus:border-primary font-body-sm text-body-sm interactive-element" placeholder="Search employees by name, role or skill..." type="text"/>
</div>
<button className="flex items-center gap-xs px-md h-10 border border-outline-variant rounded-lg font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-container-low interactive-element btn-active-state">
<span className="material-symbols-outlined text-[18px]">filter_list</span>
                Status
            </button>
<button className="flex items-center gap-xs px-md h-10 border border-outline-variant rounded-lg font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-container-low interactive-element btn-active-state">
<span className="material-symbols-outlined text-[18px]">language</span>
                Language
            </button>
</div>
{/* Employee Bento Grid */}
<div className="bento-grid">

{loading ? (
  <div className="col-span-full text-center py-xl text-on-surface-variant">Loading AI Employees...</div>
) : (
  employees.map((employee: any, index: number) => (
    <article key={employee.id} className={`employee-card bg-white border border-outline-variant rounded-xl overflow-hidden group flex flex-col animate-entrance delay-${(index % 4) + 1}`}>
    <div className="p-lg flex-1">
    <div className="flex justify-between items-start mb-lg">
    <div className="flex gap-md">
    <div className="w-16 h-16 rounded-xl overflow-hidden border border-outline-variant bg-surface-container-low flex items-center justify-center">
    <span className="material-symbols-outlined text-primary text-[32px]">smart_toy</span>
    </div>
    <div>
    <div className="flex items-center gap-sm mb-xs">
    <h3 className="font-headline-md text-headline-md text-on-surface">{employee.name}</h3>
    <span className={`px-sm py-xs text-[10px] uppercase tracking-wider font-bold rounded-lg ${employee.status === 'Active' ? 'bg-secondary-container text-on-secondary-container' : employee.status === 'Idle' ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-surface-container-highest text-on-surface-variant'}`}>{employee.status}</span>
    </div>
    <p className="font-body-sm text-body-sm text-on-surface-variant">{employee.role}</p>
    </div>
    </div>
    {employee.status === 'Active' && <div className="dot-pulse"></div>}
    </div>
    <div className="space-y-md mb-lg">
    <div className="flex items-center gap-md">
    <span className="material-symbols-outlined text-outline text-[20px]">call</span>
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
    <div className="card-actions px-lg py-md bg-surface-container border-t border-outline-variant flex justify-between items-center opacity-0 transition-opacity duration-200">
    <button className="flex items-center gap-xs font-label-sm text-label-sm text-on-surface-variant hover:text-primary interactive-element btn-active-state">
    <span className="material-symbols-outlined text-[18px]">edit</span> Edit
                        </button>
    <div className="flex gap-md">
    <button className="material-symbols-outlined text-error hover:text-red-700 p-xs rounded-lg interactive-element btn-active-state" title="Delete" onClick={() => aiEmployeesService.delete(employee.id)}>delete</button>
    </div>
    </div>
    </article>
  ))
)}

{/* Add New Placeholder */}
<Link to="/create-employee" className="employee-card border-2 border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center p-xxl hover:border-primary hover:bg-primary/5 group min-h-[340px] interactive-element btn-active-state animate-entrance delay-4">
<div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center mb-md group-hover:scale-110 group-hover:bg-primary/10 interactive-element">
<span className="material-symbols-outlined text-on-surface-variant text-[32px] group-hover:text-primary interactive-element">add</span>
</div>
<h4 className="font-headline-md text-headline-md text-on-surface-variant group-hover:text-primary interactive-element">Hire AI Employee</h4>
<p className="font-body-sm text-body-sm text-outline mt-xs">Select from templates or build custom</p>
</Link>
</div>
</div>
    </>
  );
}


