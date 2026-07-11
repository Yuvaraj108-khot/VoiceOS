
export default function SearchResultsPage() {
  return (
    <>
<div className="pt-xxxl pb-xxxl px-gutter max-w-7xl mx-auto space-y-xxl">
<div className="flex flex-col md:flex-row justify-between items-end gap-md">
<div>
<p className="text-primary font-label-md text-label-md uppercase tracking-widest mb-xs">Operational Intelligence</p>
<h1 className="font-display text-display text-on-surface">System Overview</h1>
</div>
<div className="flex gap-sm">
<button className="px-md py-xs bg-surface-container-highest border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface hover:bg-outline-variant transition-colors">Export Report</button>
<button className="px-md py-xs bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container transition-colors shadow-sm">Initialize AI Agent</button>
</div>
</div>
{/* Bento Grid Stats */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
<div className="md:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-xl relative overflow-hidden">
<div className="relative z-10">
<h2 className="font-headline-md text-headline-md text-on-surface mb-md">Active Call Volume</h2>
<div className="h-48 w-full flex items-end gap-xs">
{/* Simulated bar chart */}
<div className="flex-1 bg-primary-container h-[40%] rounded-t-sm"></div>
<div className="flex-1 bg-primary-container h-[60%] rounded-t-sm"></div>
<div className="flex-1 bg-primary h-[85%] rounded-t-sm"></div>
<div className="flex-1 bg-primary-container h-[55%] rounded-t-sm"></div>
<div className="flex-1 bg-primary-container h-[70%] rounded-t-sm"></div>
<div className="flex-1 bg-primary h-[95%] rounded-t-sm"></div>
<div className="flex-1 bg-primary-container h-[45%] rounded-t-sm"></div>
</div>
</div>
<div className="absolute top-0 right-0 p-xl">
<span className="text-label-sm text-primary flex items-center gap-xs bg-primary-fixed px-sm py-1 rounded-full">+12.4% <span className="material-symbols-outlined text-[14px]">trending_up</span></span>
</div>
</div>
<div className="bg-inverse-surface text-inverse-on-surface rounded-xl p-xl flex flex-col justify-between">
<div>
<span className="material-symbols-outlined text-primary-fixed-dim text-[40px] mb-md">auto_awesome</span>
<h3 className="font-headline-md text-headline-md mb-xs">AI Efficiency</h3>
<p className="font-body-sm opacity-80">98.2% of inbound queries resolved without human intervention this week.</p>
</div>
<div className="mt-xl">
<div className="w-full bg-on-surface-variant h-1 rounded-full overflow-hidden">
<div className="bg-primary-fixed h-full w-[98.2%]"></div>
</div>
</div>
</div>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
<div className="p-lg bg-surface border border-outline-variant rounded-xl">
<p className="text-outline font-label-sm text-label-sm uppercase mb-xs">Avg. Response Time</p>
<p className="text-headline-md font-headline-md text-on-surface">1.2s</p>
</div>
<div className="p-lg bg-surface border border-outline-variant rounded-xl">
<p className="text-outline font-label-sm text-label-sm uppercase mb-xs">Active Employees</p>
<p className="text-headline-md font-headline-md text-on-surface">24</p>
</div>
<div className="p-lg bg-surface border border-outline-variant rounded-xl">
<p className="text-outline font-label-sm text-label-sm uppercase mb-xs">Total Customers</p>
<p className="text-headline-md font-headline-md text-on-surface">4.8k</p>
</div>
<div className="p-lg bg-surface border border-outline-variant rounded-xl">
<p className="text-outline font-label-sm text-label-sm uppercase mb-xs">System Uptime</p>
<p className="text-headline-md font-headline-md text-on-surface">99.9%</p>
</div>
</div>
</div>
    </>
  );
}


