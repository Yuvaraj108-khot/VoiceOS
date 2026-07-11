import React from 'react';

export default function DashboardPage() {
  return (
    <>
<div className="flex-1 p-lg md:p-xxl space-y-xl max-w-[1440px] mx-auto w-full">
{/* Header Section */}
<section className="flex flex-col md:flex-row md:items-end justify-between gap-md">
<div>
<h2 className="font-headline-lg text-headline-lg text-on-surface">Executive Overview</h2>
<p className="font-body-md text-body-md text-on-surface-variant">Real-time performance across 12 active AI instances.</p>
</div>
<div className="flex items-center gap-sm">
<button className="button-hover bg-surface border border-outline-variant text-on-surface px-md py-sm rounded-lg font-label-md flex items-center gap-xs hover:bg-surface-container-low">
<span className="material-symbols-outlined text-[18px]">calendar_today</span>
                    Last 24 Hours
                </button>
<button className="button-hover bg-primary text-on-primary px-md py-sm rounded-lg font-label-md flex items-center gap-xs hover:bg-primary-container shadow-md">
<span className="material-symbols-outlined text-[18px]">add</span>
                    Deploy Agent
                </button>
</div>
</section>
{/* Metrics Bento Grid */}
<section className="grid grid-cols-1 md:grid-cols-3 gap-lg">
{/* Calls Today */}
<div className="metric-card-hover bg-surface border border-outline-variant p-lg rounded-xl flex flex-col justify-between cursor-default">
<div className="flex justify-between items-start">
<div className="bg-primary-fixed p-sm rounded-lg">
<span className="material-symbols-outlined text-primary">call</span>
</div>
<span className="text-primary font-label-sm">+12.4%</span>
</div>
<div className="mt-xl">
<p className="font-label-sm text-label-sm text-on-surface-variant uppercase">Calls Today</p>
<h3 className="font-display text-display leading-tight">2,481</h3>
</div>
<div className="mt-md flex items-end gap-xs h-12">
<div className="flex-1 bg-primary-fixed h-4 rounded-t-sm animate-draw-up" style={{"animationDelay":"100ms"}}></div>
<div className="flex-1 bg-primary-fixed h-8 rounded-t-sm animate-draw-up" style={{"animationDelay":"200ms"}}></div>
<div className="flex-1 bg-primary-fixed h-6 rounded-t-sm animate-draw-up" style={{"animationDelay":"300ms"}}></div>
<div className="flex-1 bg-primary-fixed h-10 rounded-t-sm animate-draw-up" style={{"animationDelay":"400ms"}}></div>
<div className="flex-1 bg-primary h-12 rounded-t-sm animate-draw-up" style={{"animationDelay":"500ms"}}></div>
</div>
</div>
{/* Avg Satisfaction */}
<div className="metric-card-hover bg-surface border border-outline-variant p-lg rounded-xl flex flex-col justify-between cursor-default">
<div className="flex justify-between items-start">
<div className="bg-secondary-fixed p-sm rounded-lg">
<span className="material-symbols-outlined text-on-secondary-container">sentiment_very_satisfied</span>
</div>
<span className="text-on-secondary-container font-label-sm">Optimal</span>
</div>
<div className="mt-xl">
<p className="font-label-sm text-label-sm text-on-surface-variant uppercase">Avg. Satisfaction</p>
<div className="flex items-baseline gap-xs">
<h3 className="font-display text-display leading-tight">4.9</h3>
<span className="text-body-lg text-outline">/ 5.0</span>
</div>
</div>
<div className="mt-md flex items-center gap-sm">
<div className="flex-1 bg-surface-container-highest h-2 rounded-full relative overflow-hidden">
<div className="absolute left-0 top-0 h-full bg-on-secondary-fixed-variant rounded-full w-[98%] animate-draw-right"></div>
</div>
<span className="font-label-sm text-on-surface-variant">98%</span>
</div>
</div>
{/* Appointments Booked */}
<div className="metric-card-hover bg-surface border border-outline-variant p-lg rounded-xl flex flex-col justify-between cursor-default">
<div className="flex justify-between items-start">
<div className="bg-tertiary-fixed p-sm rounded-lg">
<span className="material-symbols-outlined text-on-tertiary-fixed-variant">event_available</span>
</div>
<span className="text-on-tertiary-fixed-variant font-label-sm">Target: 150</span>
</div>
<div className="mt-xl">
<p className="font-label-sm text-label-sm text-on-surface-variant uppercase">Appointments Booked</p>
<h3 className="font-display text-display leading-tight">142</h3>
</div>
<div className="mt-md">
<div className="flex -space-x-2">
<div className="w-8 h-8 rounded-full border-2 border-surface bg-slate-300 hover:z-10 transition-transform hover:scale-125" style={{}}></div>
<div className="w-8 h-8 rounded-full border-2 border-surface bg-slate-400 hover:z-10 transition-transform hover:scale-125" style={{}}></div>
<div className="w-8 h-8 rounded-full border-2 border-surface bg-slate-500 hover:z-10 transition-transform hover:scale-125" style={{}}></div>
<div className="w-8 h-8 rounded-full border-2 border-surface bg-primary-container flex items-center justify-center text-[10px] text-on-primary-container font-bold hover:z-10 transition-transform hover:scale-125">+139</div>
</div>
</div>
</div>
</section>
{/* Secondary Bento Row */}
<section className="grid grid-cols-1 lg:grid-cols-3 gap-lg h-full">
{/* Live Activity Feed */}
<div className="lg:col-span-2 bg-surface border border-outline-variant rounded-xl flex flex-col overflow-hidden">
<div className="px-lg py-md border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
<div className="flex items-center gap-sm">
<span className="w-2 h-2 bg-error rounded-full chart-pulse"></span>
<h4 className="font-label-md text-label-md font-bold uppercase">Live Activity</h4>
</div>
<span className="font-label-sm text-label-sm text-primary cursor-pointer hover:underline">View All</span>
</div>
<div className="flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
<div className="divide-y divide-outline-variant">
{/* Feed Item 1 */}
<div className="p-lg hover:bg-surface-container-low flex gap-md stagger-feed-1">
<div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center flex-shrink-0">
<span className="material-symbols-outlined text-outline">graphic_eq</span>
</div>
<div className="space-y-xs">
<div className="flex items-center gap-sm">
<span className="font-label-md text-on-surface font-bold">Sienna</span>
<span className="text-[10px] bg-secondary-container text-on-secondary-container px-xs py-0.5 rounded uppercase">Success</span>
<span className="font-label-sm text-outline text-[11px]">2m ago</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant italic">"I've updated your billing cycle to the 15th as requested. Is there anything else?"</p>
<p className="font-label-sm text-label-sm text-outline">Resolved billing inquiry for User #8821</p>
</div>
</div>
{/* Feed Item 2 */}
<div className="p-lg hover:bg-surface-container-low flex gap-md stagger-feed-2">
<div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center flex-shrink-0">
<span className="material-symbols-outlined text-outline">graphic_eq</span>
</div>
<div className="space-y-xs">
<div className="flex items-center gap-sm">
<span className="font-label-md text-on-surface font-bold">Marcus</span>
<span className="text-[10px] bg-primary-fixed text-primary px-xs py-0.5 rounded uppercase">Active</span>
<span className="font-label-sm text-outline text-[11px]">4m ago</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant italic">"Let me look up the availability for Dr. Aris in the Downtown clinic..."</p>
<p className="font-label-sm text-label-sm text-outline">Booking appointment for User #9012</p>
</div>
</div>
{/* Feed Item 3 */}
<div className="p-lg hover:bg-surface-container-low flex gap-md stagger-feed-3">
<div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center flex-shrink-0">
<span className="material-symbols-outlined text-outline">graphic_eq</span>
</div>
<div className="space-y-xs">
<div className="flex items-center gap-sm">
<span className="font-label-md text-on-surface font-bold">Nova</span>
<span className="text-[10px] bg-tertiary-fixed text-on-tertiary-fixed-variant px-xs py-0.5 rounded uppercase">Transfer</span>
<span className="font-label-sm text-outline text-[11px]">8m ago</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant italic">"This requires specialist level access. Connecting you to a human supervisor."</p>
<p className="font-label-sm text-label-sm text-outline">Escalated complex policy query</p>
</div>
</div>
</div>
</div>
</div>
{/* AI Employees Status Overview */}
<div className="bg-surface border border-outline-variant rounded-xl flex flex-col overflow-hidden">
<div className="px-lg py-md border-b border-outline-variant bg-surface-container-lowest">
<h4 className="font-label-md text-label-md font-bold uppercase">AI Fleet Status</h4>
</div>
<div className="p-lg space-y-md">
<div className="flex justify-between items-center">
<span className="font-label-sm text-label-sm text-on-surface-variant">Fleet Health</span>
<span className="font-label-sm text-label-sm font-bold text-primary">12/12 Online</span>
</div>
<div className="grid grid-cols-4 gap-sm">
{/* Simple Status Indicators */}
<div className="h-1.5 bg-primary rounded-full animate-draw-right" style={{"animationDelay":"50ms"}}></div>
<div className="h-1.5 bg-primary rounded-full animate-draw-right" style={{"animationDelay":"100ms"}}></div>
<div className="h-1.5 bg-primary rounded-full animate-draw-right" style={{"animationDelay":"150ms"}}></div>
<div className="h-1.5 bg-primary rounded-full animate-draw-right" style={{"animationDelay":"200ms"}}></div>
<div className="h-1.5 bg-primary rounded-full animate-draw-right" style={{"animationDelay":"250ms"}}></div>
<div className="h-1.5 bg-primary rounded-full animate-draw-right" style={{"animationDelay":"300ms"}}></div>
<div className="h-1.5 bg-primary rounded-full animate-draw-right" style={{"animationDelay":"350ms"}}></div>
<div className="h-1.5 bg-primary rounded-full animate-draw-right" style={{"animationDelay":"400ms"}}></div>
<div className="h-1.5 bg-primary rounded-full animate-draw-right" style={{"animationDelay":"450ms"}}></div>
<div className="h-1.5 bg-primary rounded-full animate-draw-right" style={{"animationDelay":"500ms"}}></div>
<div className="h-1.5 bg-primary rounded-full animate-draw-right" style={{"animationDelay":"550ms"}}></div>
<div className="h-1.5 bg-primary rounded-full animate-draw-right" style={{"animationDelay":"600ms"}}></div>
</div>
<div className="mt-xl space-y-md">
<div className="flex items-center justify-between p-sm border border-outline-variant rounded-lg hover:border-primary cursor-pointer">
<div className="flex items-center gap-sm">
<div className="w-8 h-8 rounded-full bg-slate-200" style={{}}></div>
<span className="font-label-md text-label-md">Sienna</span>
</div>
<span className="font-label-sm text-label-sm text-primary">In Call</span>
</div>
<div className="flex items-center justify-between p-sm border border-outline-variant rounded-lg hover:border-primary cursor-pointer">
<div className="flex items-center gap-sm">
<div className="w-8 h-8 rounded-full bg-slate-200" style={{}}></div>
<span className="font-label-md text-label-md">Marcus</span>
</div>
<span className="font-label-sm text-label-sm text-primary">In Call</span>
</div>
<div className="flex items-center justify-between p-sm border border-outline-variant rounded-lg hover:border-primary cursor-pointer">
<div className="flex items-center gap-sm">
<div className="w-8 h-8 rounded-full bg-slate-200" style={{}}></div>
<span className="font-label-md text-label-md">Nova</span>
</div>
<span className="font-label-sm text-label-sm text-on-surface-variant">Idle</span>
</div>
</div>
<button className="button-hover w-full mt-lg py-sm border-2 border-dashed border-outline-variant rounded-lg text-outline font-label-md hover:border-primary hover:text-primary transition-all">
                        + Add New Agent
                    </button>
</div>
</div>
</section>
</div>
    </>
  );
}


