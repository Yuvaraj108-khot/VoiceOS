import React from 'react';

export default function AIEmployeesPage() {
  return (
    <>
<div className="pt-xxxl pb-xxxl px-md md:px-xxl max-w-[1440px] mx-auto mt-xxl">
{/* Page Header */}
<section className="flex flex-col md:flex-row justify-between items-start md:items-center mb-xxl gap-md animate-entrance">
<div>
<h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">AI Workforce</h1>
<p className="font-body-md text-body-md text-on-surface-variant">Manage and scale your autonomous voice workforce with precision.</p>
</div>
<button className="flex items-center gap-sm bg-primary text-on-primary px-lg py-md rounded-xl hover:bg-primary-container interactive-element btn-active-state shadow-sm">
<span className="material-symbols-outlined">add</span>
<span className="font-label-md text-label-md">Add Employee</span>
</button>
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
{/* Employee Card 1 */}
<article className="employee-card bg-white border border-outline-variant rounded-xl overflow-hidden group flex flex-col animate-entrance delay-1">
<div className="p-lg flex-1">
<div className="flex justify-between items-start mb-lg">
<div className="flex gap-md">
<div className="w-16 h-16 rounded-xl overflow-hidden border border-outline-variant">
<img className="w-full h-full object-cover" data-alt="A clean, minimalist 3D render of a friendly male avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDyk0Wg1D3vqi3rIJx6d_wKxYEg-uHdvolqZWiWR7K-RR3In94BZjYR1Afz5kDrGqRAwEEeFPHOWqILNKIWcGR2esl0kiBFrZTuyVYlbAfI8rCTbgzn-pt_gSoGZXEai-CPGSj0K9y90s4mGhDFWhoCNxQXXszAP4uwBfYYbQukwr-j49FX4ZeFokLiF-2S8a8F-Gajz87TbUg53mbIaHIdz0evb9JEqkvSpP804ujY0C-31HqctfPFwg"/>
</div>
<div>
<div className="flex items-center gap-sm mb-xs">
<h3 className="font-headline-md text-headline-md text-on-surface">Marcus</h3>
<span className="px-sm py-xs bg-secondary-container text-on-secondary-container text-[10px] uppercase tracking-wider font-bold rounded-lg">Active</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant">Billing &amp; Payments</p>
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
<div className="bg-surface-container-low rounded-lg p-md flex justify-between items-center group-hover:bg-surface-container interactive-element">
<span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Current Handles</span>
<span className="font-headline-md text-headline-md text-primary font-bold">142</span>
</div>
</div>
<div className="card-actions px-lg py-md bg-surface-container border-t border-outline-variant flex justify-between items-center opacity-0 transition-opacity duration-200">
<button className="flex items-center gap-xs font-label-sm text-label-sm text-on-surface-variant hover:text-primary interactive-element btn-active-state">
<span className="material-symbols-outlined text-[18px]">edit</span> Edit
                    </button>
<div className="flex gap-md">
<button className="material-symbols-outlined text-on-surface-variant hover:text-primary p-xs rounded-lg interactive-element btn-active-state" title="Pause">pause_circle</button>
<button className="material-symbols-outlined text-on-surface-variant hover:text-primary p-xs rounded-lg interactive-element btn-active-state" title="Duplicate">content_copy</button>
</div>
</div>
</article>
{/* Employee Card 2 */}
<article className="employee-card bg-white border border-outline-variant rounded-xl overflow-hidden group flex flex-col animate-entrance delay-2">
<div className="p-lg flex-1">
<div className="flex justify-between items-start mb-lg">
<div className="flex gap-md">
<div className="w-16 h-16 rounded-xl overflow-hidden border border-outline-variant">
<img className="w-full h-full object-cover" data-alt="A sophisticated 3D render of a professional female avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA8TGvV_csqA9OYYZ1yveFQpPdk4hPm7EI_jlf09DyY7w2Fx4BqAiTxQ5C5aZhbGUKHshZaB92aP3DquMcM-2qAUhRpurmpIrwaKuzQBMnBTz1qCbBLrIWFEzQersVjLhIVfY1YXHDLH4Gm4FFirxEjw6VdKRNfqERA_q4X0QBcalXCuEKEQl5uyHgMQzkgIQsSITfPkA8WreEZtIET2DhtMPjJ437BcbYT94RqBia1T2eu92MJ_HGT-w"/>
</div>
<div>
<div className="flex items-center gap-sm mb-xs">
<h3 className="font-headline-md text-headline-md text-on-surface">Sienna</h3>
<span className="px-sm py-xs bg-secondary-container text-on-secondary-container text-[10px] uppercase tracking-wider font-bold rounded-lg">Active</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant">Technical Support</p>
</div>
</div>
<div className="dot-pulse"></div>
</div>
<div className="space-y-md mb-lg">
<div className="flex items-center gap-md">
<span className="material-symbols-outlined text-outline text-[20px]">call</span>
<span className="font-label-md text-label-md text-on-surface">+1 (555) 890-1234</span>
</div>
<div className="flex items-center gap-md">
<span className="material-symbols-outlined text-outline text-[20px]">record_voice_over</span>
<span className="font-label-md text-label-md text-on-surface">Helpful, Articulate</span>
</div>
<div className="flex items-center gap-md">
<span className="material-symbols-outlined text-outline text-[20px]">translate</span>
<span className="font-label-md text-label-md text-on-surface">12 languages supported</span>
</div>
</div>
<div className="bg-surface-container-low rounded-lg p-md flex justify-between items-center group-hover:bg-surface-container interactive-element">
<span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Current Handles</span>
<span className="font-headline-md text-headline-md text-primary font-bold">89</span>
</div>
</div>
<div className="card-actions px-lg py-md bg-surface-container border-t border-outline-variant flex justify-between items-center opacity-0 transition-opacity duration-200">
<button className="flex items-center gap-xs font-label-sm text-label-sm text-on-surface-variant hover:text-primary interactive-element btn-active-state">
<span className="material-symbols-outlined text-[18px]">edit</span> Edit
                    </button>
<div className="flex gap-md">
<button className="material-symbols-outlined text-on-surface-variant hover:text-primary p-xs rounded-lg interactive-element btn-active-state" title="Pause">pause_circle</button>
<button className="material-symbols-outlined text-on-surface-variant hover:text-primary p-xs rounded-lg interactive-element btn-active-state" title="Duplicate">content_copy</button>
</div>
</div>
</article>
{/* Employee Card 3 (Training State) */}
<article className="employee-card bg-white border border-outline-variant rounded-xl overflow-hidden group flex flex-col animate-entrance delay-3">
<div className="p-lg flex-1">
<div className="flex justify-between items-start mb-lg">
<div className="flex gap-md">
<div className="w-16 h-16 rounded-xl overflow-hidden border border-outline-variant bg-surface-container-low flex items-center justify-center relative">
<img className="w-full h-full object-cover" data-alt="A stylized, modern 3D avatar of a friendly sales agent" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCc7ZLMfWvw1vFUysT1Qo_S2oaVXGIea2ma9HZCCvDcs-_FfOACPIs_dxYVNqC-Fwt3vVWnM_tQP8a6Yl3HG--YE7SUGR3Ppzv6DXldf4iAhWHDIWtYXnfaWD4divX1zHW3HwZZT0lH3HhmC6X39kCJuFaqenT0Uny59euu7YeRyqLHFjNqHf2QdS_SNcwKTLxhwAzoBdNjrHzL5Aj9OsvE17iN7JytT8hzaDwPNiDMMxqwK0dAx7BJ4A"/>
<div className="absolute inset-0 bg-white/40 backdrop-blur-[2px]"></div>
<span className="material-symbols-outlined absolute text-primary">model_training</span>
</div>
<div>
<div className="flex items-center gap-sm mb-xs">
<h3 className="font-headline-md text-headline-md text-on-surface">Aria</h3>
<span className="px-sm py-xs bg-tertiary-container text-on-tertiary-container text-[10px] uppercase tracking-wider font-bold rounded-lg">Training</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant">Sales &amp; Lead Gen</p>
</div>
</div>
</div>
<div className="space-y-md mb-lg">
<div className="flex items-center gap-md">
<span className="material-symbols-outlined text-outline text-[20px]">call</span>
<span className="font-label-md text-label-md text-on-surface">Provisioning...</span>
</div>
<div className="flex items-center gap-md">
<span className="material-symbols-outlined text-outline text-[20px]">record_voice_over</span>
<span className="font-label-md text-label-md text-on-surface">Enthusiastic, Clear</span>
</div>
<div className="flex items-center gap-md">
<span className="material-symbols-outlined text-outline text-[20px]">translate</span>
<span className="font-label-md text-label-md text-on-surface">1 language (English)</span>
</div>
</div>
<div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden mb-xs mt-lg">
<div className="h-full bg-primary w-[65%] animate-pulse"></div>
</div>
<div className="flex justify-between items-center">
<span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Training Progress</span>
<span className="font-label-sm text-label-sm text-primary font-bold">65%</span>
</div>
</div>
<div className="card-actions px-lg py-md bg-surface-container border-t border-outline-variant flex justify-between items-center opacity-0 transition-opacity duration-200">
<button className="flex items-center gap-xs font-label-sm text-label-sm text-on-surface-variant hover:text-primary interactive-element btn-active-state">
<span className="material-symbols-outlined text-[18px]">edit</span> Edit
                    </button>
<div className="flex gap-md">
<button className="material-symbols-outlined text-outline cursor-not-allowed p-xs rounded-lg" disabled="" title="Pause">pause_circle</button>
<button className="material-symbols-outlined text-on-surface-variant hover:text-primary p-xs rounded-lg interactive-element btn-active-state" title="Duplicate">content_copy</button>
</div>
</div>
</article>
{/* Add New Placeholder */}
<button className="employee-card border-2 border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center p-xxl hover:border-primary hover:bg-primary/5 group min-h-[340px] interactive-element btn-active-state animate-entrance delay-4">
<div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center mb-md group-hover:scale-110 group-hover:bg-primary/10 interactive-element">
<span className="material-symbols-outlined text-on-surface-variant text-[32px] group-hover:text-primary interactive-element">add</span>
</div>
<h4 className="font-headline-md text-headline-md text-on-surface-variant group-hover:text-primary interactive-element">Hire AI Employee</h4>
<p className="font-body-sm text-body-sm text-outline mt-xs">Select from templates or build custom</p>
</button>
</div>
</div>
    </>
  );
}


