import React, { useEffect, useState } from 'react';
import { analyticsService, AnalyticsOverview } from '../services/analytics';

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const data = await analyticsService.getOverview();
        setOverview(data);
      } catch (error) {
        console.error("Failed to load analytics metrics", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, []);

  return (
    <>
<div className="max-w-[1440px] mx-auto px-md md:px-lg lg:px-xl py-xl space-y-xl">
{/* Header & Filters Section */}
<section className="flex flex-col md:flex-row md:items-end justify-between gap-lg">
<div className="space-y-xs">
<h2 className="font-headline-lg text-headline-lg font-semibold text-on-surface">Analytics Overview</h2>
<p className="font-body-md text-body-md text-on-surface-variant">Deep-dive into your AI employees' performance metrics and conversion trends.</p>
</div>
<div className="flex flex-wrap items-center gap-sm">
{/* Date Picker Filter */}
<div className="flex items-center bg-white border border-outline-variant rounded-xl p-unit shadow-sm overflow-hidden">
<button className="px-md py-xs font-label-md text-label-md bg-secondary-container text-on-secondary-container rounded-full transition-all">Today</button>
<button className="px-md py-xs font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-low transition-all">7D</button>
<button className="px-md py-xs font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-low transition-all">30D</button>
</div>
{/* Employee Filter */}
<div className="relative group">
<button className="flex items-center gap-sm px-md h-10 bg-white border border-outline-variant rounded-xl font-label-md text-label-md text-on-surface-variant hover:border-primary transition-colors">
<span className="material-symbols-outlined text-[20px]" data-icon="group">group</span>
<span>All Employees</span>
<span className="material-symbols-outlined text-[18px]" data-icon="expand_more">expand_more</span>
</button>
</div>
<button className="flex items-center justify-center w-10 h-10 bg-primary text-white rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-sm">
<span className="material-symbols-outlined" data-icon="file_download">file_download</span>
</button>
</div>
</section>
{/* KPI Bento Grid */}
<section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
{/* Stat 1 */}
<div className="bg-white border border-outline-variant rounded-xl p-lg flex flex-col justify-between group hover:border-primary transition-colors duration-300">
<div className="flex justify-between items-start">
<span className="p-sm bg-primary-fixed rounded-lg">
<span className="material-symbols-outlined text-primary" data-icon="call">call</span>
</span>
<span className="font-label-sm text-label-sm text-green-600 bg-green-50 px-sm py-xs rounded flex items-center gap-xs">
<span className="material-symbols-outlined text-[14px]" data-icon="arrow_upward">arrow_upward</span>
                        12%
                    </span>
</div>
<div className="mt-xl">
<p className="font-label-md text-label-md text-on-surface-variant">Total Calls Handled</p>
<h3 className="font-headline-lg text-headline-lg font-bold text-on-surface">{loading ? '...' : overview?.totalCalls.toLocaleString() || '0'}</h3>
</div>
</div>
{/* Stat 2 */}
<div className="bg-white border border-outline-variant rounded-xl p-lg flex flex-col justify-between group hover:border-primary transition-colors duration-300">
<div className="flex justify-between items-start">
<span className="p-sm bg-secondary-fixed rounded-lg">
<span className="material-symbols-outlined text-secondary" data-icon="timer">timer</span>
</span>
<span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-low px-sm py-xs rounded flex items-center gap-xs">
                        Stable
                    </span>
</div>
<div className="mt-xl">
<p className="font-label-md text-label-md text-on-surface-variant">Avg. Call Duration</p>
<h3 className="font-headline-lg text-headline-lg font-bold text-on-surface">{loading ? '...' : overview?.avgDuration || '0m 0s'}</h3>
</div>
</div>
{/* Stat 3 */}
<div className="bg-white border border-outline-variant rounded-xl p-lg flex flex-col justify-between group hover:border-primary transition-colors duration-300">
<div className="flex justify-between items-start">
<span className="p-sm bg-tertiary-fixed rounded-lg">
<span className="material-symbols-outlined text-tertiary" data-icon="target">target</span>
</span>
<span className="font-label-sm text-label-sm text-green-600 bg-green-50 px-sm py-xs rounded flex items-center gap-xs">
<span className="material-symbols-outlined text-[14px]" data-icon="arrow_upward">arrow_upward</span>
                        4%
                    </span>
</div>
<div className="mt-xl">
<p className="font-label-md text-label-md text-on-surface-variant">Conversion Rate</p>
<h3 className="font-headline-lg text-headline-lg font-bold text-on-surface">{loading ? '...' : `${(overview?.successRate || 0).toFixed(1)}%`}</h3>
</div>
</div>
{/* Stat 4 */}
<div className="bg-white border border-outline-variant rounded-xl p-lg flex flex-col justify-between group hover:border-primary transition-colors duration-300">
<div className="flex justify-between items-start">
<span className="p-sm bg-primary-fixed rounded-lg">
<span className="material-symbols-outlined text-primary" data-icon="sentiment_satisfied">sentiment_satisfied</span>
</span>
<span className="font-label-sm text-label-sm text-red-600 bg-red-50 px-sm py-xs rounded flex items-center gap-xs">
<span className="material-symbols-outlined text-[14px]" data-icon="arrow_downward">arrow_downward</span>
                        2%
                    </span>
</div>
<div className="mt-xl">
<p className="font-label-md text-label-md text-on-surface-variant">Customer CSAT</p>
<h3 className="font-headline-lg text-headline-lg font-bold text-on-surface">{loading ? '...' : `${((overview?.successRate || 0) * 5).toFixed(1)}/5.0`}</h3>
</div>
</div>
</section>
{/* Main Analytics Visualizations */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
{/* Peak Call Hours (Bar Chart) - Takes 2 cols on LG */}
<div className="lg:col-span-2 bg-white border border-outline-variant rounded-xl p-lg space-y-lg relative overflow-hidden">
<div className="flex justify-between items-center">
<h4 className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-wider">Peak Call Hours</h4>
<span className="material-symbols-outlined text-outline text-[20px]" data-icon="more_horiz">more_horiz</span>
</div>
<div className="h-64 flex items-end justify-between gap-sm pt-md">
{/* Dynamic Bars */}
<div className="flex-1 group relative">
<div className="chart-bar w-full bg-primary-fixed group-hover:bg-primary rounded-t-sm" style={{"height":"40%"}}></div>
<span className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 font-label-sm text-[10px] text-outline">08:00</span>
</div>
<div className="flex-1 group relative">
<div className="chart-bar w-full bg-primary-fixed group-hover:bg-primary rounded-t-sm" style={{"height":"65%"}}></div>
<span className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 font-label-sm text-[10px] text-outline">10:00</span>
</div>
<div className="flex-1 group relative">
<div className="chart-bar w-full bg-primary-container group-hover:bg-primary rounded-t-sm" style={{"height":"90%"}}>
<div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-on-background text-white text-[10px] px-sm py-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">1.2k</div>
</div>
<span className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 font-label-sm text-[10px] text-outline">12:00</span>
</div>
<div className="flex-1 group relative">
<div className="chart-bar w-full bg-primary-fixed group-hover:bg-primary rounded-t-sm" style={{"height":"75%"}}></div>
<span className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 font-label-sm text-[10px] text-outline">14:00</span>
</div>
<div className="flex-1 group relative">
<div className="chart-bar w-full bg-primary-fixed group-hover:bg-primary rounded-t-sm" style={{"height":"85%"}}></div>
<span className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 font-label-sm text-[10px] text-outline">16:00</span>
</div>
<div className="flex-1 group relative">
<div className="chart-bar w-full bg-primary-fixed group-hover:bg-primary rounded-t-sm" style={{"height":"55%"}}></div>
<span className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 font-label-sm text-[10px] text-outline">18:00</span>
</div>
<div className="flex-1 group relative">
<div className="chart-bar w-full bg-primary-fixed group-hover:bg-primary rounded-t-sm" style={{"height":"30%"}}></div>
<span className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 font-label-sm text-[10px] text-outline">20:00</span>
</div>
</div>
</div>
{/* Language Distribution (Pie Chart) */}
<div className="bg-white border border-outline-variant rounded-xl p-lg space-y-lg">
<div className="flex justify-between items-center">
<h4 className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-wider">Language Distribution</h4>
<span className="material-symbols-outlined text-outline text-[20px]" data-icon="translate">translate</span>
</div>
<div className="relative h-48 flex items-center justify-center">
{/* Mock Pie Chart with SVG */}
<svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 36 36">
<circle cx="18" cy="18" fill="transparent" r="15.915" stroke="#dae2fd" stroke-width="4"></circle>
<circle cx="18" cy="18" fill="transparent" r="15.915" stroke="#0058be" stroke-dasharray="65 35" stroke-dashoffset="0" stroke-width="4"></circle>
<circle cx="18" cy="18" fill="transparent" r="15.915" stroke="#4d5d73" stroke-dasharray="20 80" stroke-dashoffset="-65" stroke-width="4"></circle>
<circle cx="18" cy="18" fill="transparent" r="15.915" stroke="#adc6ff" stroke-dasharray="15 85" stroke-dashoffset="-85" stroke-width="4"></circle>
</svg>
<div className="absolute inset-0 flex flex-col items-center justify-center">
<span className="font-headline-md text-headline-md font-bold">12</span>
<span className="font-label-sm text-label-sm text-outline">Total</span>
</div>
</div>
<div className="space-y-sm">
<div className="flex justify-between items-center font-label-md text-label-md">
<div className="flex items-center gap-sm">
<span className="w-3 h-3 rounded-full bg-primary"></span>
<span>English</span>
</div>
<span className="text-on-surface font-semibold">65%</span>
</div>
<div className="flex justify-between items-center font-label-md text-label-md">
<div className="flex items-center gap-sm">
<span className="w-3 h-3 rounded-full bg-tertiary"></span>
<span>Spanish</span>
</div>
<span className="text-on-surface font-semibold">20%</span>
</div>
<div className="flex justify-between items-center font-label-md text-label-md">
<div className="flex items-center gap-sm">
<span className="w-3 h-3 rounded-full bg-primary-fixed-dim"></span>
<span>Others</span>
</div>
<span className="text-on-surface font-semibold">15%</span>
</div>
</div>
</div>
{/* Lead Conversion Rate (Line Chart) - Full width on MD/LG */}
<div className="lg:col-span-3 bg-white border border-outline-variant rounded-xl p-lg space-y-lg">
<div className="flex justify-between items-center">
<div className="space-y-xs">
<h4 className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-wider">Lead Conversion Rate</h4>
<p className="font-body-sm text-body-sm text-outline">Monthly trending vs target performance</p>
</div>
<div className="flex gap-md">
<div className="flex items-center gap-xs font-label-sm text-label-sm">
<span className="w-2 h-2 rounded-full bg-primary"></span>
<span>Actual</span>
</div>
<div className="flex items-center gap-xs font-label-sm text-label-sm">
<span className="w-2 h-2 rounded-full bg-outline-variant"></span>
<span>Target</span>
</div>
</div>
</div>
{/* Mock Line Chart */}
<div className="relative h-72 w-full pt-lg">
<div className="absolute inset-0 flex flex-col justify-between py-xs pointer-events-none">
<div className="border-t border-outline-variant w-full opacity-30"></div>
<div className="border-t border-outline-variant w-full opacity-30"></div>
<div className="border-t border-outline-variant w-full opacity-30"></div>
<div className="border-t border-outline-variant w-full opacity-30"></div>
<div className="border-t border-outline-variant w-full opacity-30"></div>
</div>
{/* Line Path with SVG */}
<svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 100">
{/* Target Line */}
<path d="M0,70 L100,68 L200,65 L300,63 L400,60 L500,58 L600,55 L700,52 L800,50 L900,48 L1000,45" fill="none" stroke="#c2c6d6" stroke-dasharray="8,4" stroke-width="2"></path>
{/* Actual Line */}
<path d="M0,80 L100,75 L200,60 L300,65 L400,40 L500,30 L600,45 L700,20 L800,25 L900,10 L1000,5" fill="none" stroke="#0058be" stroke-linejoin="round" stroke-width="3"></path>
{/* Area gradient */}
<path d="M0,80 L100,75 L200,60 L300,65 L400,40 L500,30 L600,45 L700,20 L800,25 L900,10 L1000,5 L1000,100 L0,100 Z" fill="url(#line-gradient)" opacity="0.1"></path>
<defs>
<linearGradient id="line-gradient" x1="0%" x2="0%" y1="0%" y2="100%">
<stop offset="0%" stop-color="#0058be"></stop>
<stop offset="100%" stop-color="#0058be" stop-opacity="0"></stop>
</linearGradient>
</defs>
</svg>
<div className="flex justify-between mt-sm">
<span className="font-label-sm text-[10px] text-outline">JAN</span>
<span className="font-label-sm text-[10px] text-outline">MAR</span>
<span className="font-label-sm text-[10px] text-outline">MAY</span>
<span className="font-label-sm text-[10px] text-outline">JUL</span>
<span className="font-label-sm text-[10px] text-outline">SEP</span>
<span className="font-label-sm text-[10px] text-outline">NOV</span>
</div>
</div>
</div>
</div>
{/* Recent Insights / Asymmetric Row */}
<section className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
<div className="bg-primary text-white rounded-xl p-lg space-y-md relative overflow-hidden group">
<div className="relative z-10 space-y-md">
<span className="font-label-sm text-label-sm px-sm py-xs bg-white/20 rounded inline-block">AI SUGGESTION</span>
<h3 className="font-headline-md text-headline-md font-semibold">Scaling Required</h3>
<p className="font-body-md text-body-md text-primary-fixed/80">Based on peak hour trends (12 PM - 4 PM), we recommend activating 3 additional AI instances to maintain response latency below 150ms.</p>
<button className="flex items-center gap-sm px-lg h-12 bg-white text-primary rounded-xl font-label-md text-label-md font-bold hover:bg-primary-fixed transition-colors">
                        Deploy Auto-Scaling
                        <span className="material-symbols-outlined text-[18px]" data-icon="auto_mode">auto_mode</span>
</button>
</div>
{/* Abstract visual element */}
<div className="absolute -right-10 -bottom-10 w-48 h-48 bg-primary-container rounded-full opacity-50 blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
</div>
<div className="bg-white border border-outline-variant rounded-xl p-lg space-y-md">
<h4 className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-wider">Top Performing Employees</h4>
<div className="space-y-md max-h-64 overflow-y-auto custom-scrollbar pr-sm">
{/* Employee Row */}
<div className="flex items-center justify-between p-sm hover:bg-surface-container-low rounded-lg transition-colors">
<div className="flex items-center gap-md">
<div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-secondary font-bold">JD</div>
<div>
<p className="font-label-md text-label-md text-on-surface">Jordan Davis</p>
<p className="font-body-sm text-[12px] text-outline">Inbound Support</p>
</div>
</div>
<div className="text-right">
<p className="font-label-md text-label-md text-on-surface">94.2%</p>
<p className="font-body-sm text-[10px] text-green-600">Conv. Rate</p>
</div>
</div>
{/* Employee Row */}
<div className="flex items-center justify-between p-sm hover:bg-surface-container-low rounded-lg transition-colors">
<div className="flex items-center gap-md">
<div className="w-10 h-10 rounded-full bg-tertiary-fixed-dim flex items-center justify-center text-tertiary font-bold">SR</div>
<div>
<p className="font-label-md text-label-md text-on-surface">Sarah Rivera</p>
<p className="font-body-sm text-[12px] text-outline">Lead Qualification</p>
</div>
</div>
<div className="text-right">
<p className="font-label-md text-label-md text-on-surface">88.5%</p>
<p className="font-body-sm text-[10px] text-green-600">Conv. Rate</p>
</div>
</div>
{/* Employee Row */}
<div className="flex items-center justify-between p-sm hover:bg-surface-container-low rounded-lg transition-colors">
<div className="flex items-center gap-md">
<div className="w-10 h-10 rounded-full bg-primary-fixed-dim flex items-center justify-center text-primary font-bold">MK</div>
<div>
<p className="font-label-md text-label-md text-on-surface">Marcus Knight</p>
<p className="font-body-sm text-[12px] text-outline">Tech Support</p>
</div>
</div>
<div className="text-right">
<p className="font-label-md text-label-md text-on-surface">82.1%</p>
<p className="font-body-sm text-[10px] text-green-600">Conv. Rate</p>
</div>
</div>
</div>
</div>
</section>
</div>
    </>
  );
}


