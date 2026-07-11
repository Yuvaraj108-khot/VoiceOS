import React from 'react';

export default function KnowledgeCenterPage() {
  return (
    <>
<div className="pt-xxxl px-md md:px-margin max-w-[1440px] mx-auto">
{/* Dashboard Header Area */}
<section className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-xxl mt-lg">
<div>
<h2 className="font-headline-lg text-headline-lg-mobile text-on-surface mb-xs">Knowledge Center</h2>
<p className="font-body-md text-on-surface-variant max-w-2xl">Manage the collective intelligence of your VoiceOS instance. Upload documents, sync websites, and monitor processing status in real-time.</p>
</div>
<div className="flex items-center gap-sm">
<button className="bg-primary text-on-primary font-label-md py-sm px-lg rounded-xl flex items-center gap-xs hover:brightness-110 active:scale-95 transition-all" onClick="openModal()">
<span className="material-symbols-outlined text-[20px]" data-icon="add">add</span>
                    Add Source
                </button>
</div>
</section>
{/* Stats Overview (Asymmetric Layout) */}
<div className="grid grid-cols-1 md:grid-cols-12 gap-lg mb-xxl">
<div className="md:col-span-8 bg-surface border border-outline-variant rounded-xl p-lg flex flex-col justify-between">
<div className="flex justify-between items-start mb-md">
<div>
<h3 className="font-label-md text-on-surface-variant uppercase tracking-wider mb-xs">Storage Capacity</h3>
<p className="font-headline-md text-on-surface font-bold">12.4 GB / 50 GB</p>
</div>
<span className="material-symbols-outlined text-primary text-[32px]" data-icon="cloud_done">cloud_done</span>
</div>
<div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
<div className="bg-primary h-full rounded-full" style={{"width":"25%"}}></div>
</div>
</div>
<div className="md:col-span-4 bg-primary-container text-on-primary-container rounded-xl p-lg flex flex-col justify-center border border-primary">
<p className="font-label-md mb-xs opacity-90">Live Syncing</p>
<div className="flex items-center gap-sm">
<div className="w-2 h-2 bg-on-primary-container rounded-full pulse-ai"></div>
<p className="font-headline-md font-bold">2 Sources</p>
</div>
<p className="font-body-sm mt-sm opacity-80">Syncing website and processing FAQ sheet.</p>
</div>
</div>
{/* Search & Filter Bar */}
<div className="mb-lg flex flex-col md:flex-row gap-md">
<div className="relative flex-grow">
<span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline" data-icon="search">search</span>
<input className="w-full pl-xxl pr-md h-12 bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all font-body-md" placeholder="Search your knowledge base..." type="text"/>
</div>
<div className="flex gap-sm">
<button className="h-12 px-md border border-outline-variant rounded-xl flex items-center gap-xs font-label-md text-on-surface-variant hover:bg-surface-container-low transition-colors">
<span className="material-symbols-outlined text-[20px]" data-icon="filter_list">filter_list</span>
                    Filter
                </button>
<button className="h-12 px-md border border-outline-variant rounded-xl flex items-center gap-xs font-label-md text-on-surface-variant hover:bg-surface-container-low transition-colors">
<span className="material-symbols-outlined text-[20px]" data-icon="sort">sort</span>
                    Sort
                </button>
</div>
</div>
{/* Library Grid (Bento Style) */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
{/* File: Corporate Handbook */}
<div className="bg-surface border border-outline-variant rounded-xl p-lg file-card-hover transition-all flex flex-col group">
<div className="flex justify-between items-start mb-lg">
<div className="p-sm bg-surface-container-highest rounded-lg text-primary">
<span className="material-symbols-outlined text-[32px]" data-icon="picture_as_pdf">picture_as_pdf</span>
</div>
<div className="px-sm py-xs bg-[#E8F5E9] text-[#2E7D32] rounded font-label-sm flex items-center gap-xs">
<span className="material-symbols-outlined text-[14px]" data-icon="check_circle">check_circle</span>
                        Indexed
                    </div>
</div>
<h4 className="font-headline-md text-on-surface mb-xs truncate" title="Corporate_Handbook_2024.pdf">Corporate_Handbook_2024.pdf</h4>
<p className="font-body-sm text-on-surface-variant mb-lg">Last updated 2 days ago • 2.4 MB</p>
<div className="mt-auto flex justify-between items-center pt-md border-t border-outline-variant">
<p className="font-label-sm text-outline">PDF Document</p>
<div className="flex gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
<button className="p-xs hover:bg-surface-container-low rounded"><span className="material-symbols-outlined text-[20px]" data-icon="download">download</span></button>
<button className="p-xs hover:bg-surface-container-low rounded text-error"><span className="material-symbols-outlined text-[20px]" data-icon="delete">delete</span></button>
</div>
</div>
</div>
{/* Website: VoiceOS Docs */}
<div className="bg-surface border border-outline-variant rounded-xl p-lg file-card-hover transition-all flex flex-col group relative overflow-hidden">
<div className="flex justify-between items-start mb-lg">
<div className="p-sm bg-surface-container-highest rounded-lg text-tertiary">
<span className="material-symbols-outlined text-[32px]" data-icon="language">language</span>
</div>
<div className="px-sm py-xs bg-secondary-container text-on-secondary-container rounded font-label-sm flex items-center gap-xs">
<span className="material-symbols-outlined text-[14px] animate-spin" data-icon="sync">sync</span>
                        Syncing 82%
                    </div>
</div>
<h4 className="font-headline-md text-on-surface mb-xs truncate" title="Website: voiceos.ai/docs">Website: voiceos.ai/docs</h4>
<p className="font-body-sm text-on-surface-variant mb-lg">Active crawl in progress...</p>
<div className="w-full bg-surface-container-highest h-1 rounded-full mb-lg overflow-hidden">
<div className="bg-primary h-full rounded-full" style={{"width":"82%"}}></div>
</div>
<div className="mt-auto flex justify-between items-center pt-md border-t border-outline-variant">
<p className="font-label-sm text-outline">Web Source</p>
<div className="flex gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
<button className="p-xs hover:bg-surface-container-low rounded"><span className="material-symbols-outlined text-[20px]" data-icon="settings">settings</span></button>
<button className="p-xs hover:bg-surface-container-low rounded text-error"><span className="material-symbols-outlined text-[20px]" data-icon="link_off">link_off</span></button>
</div>
</div>
</div>
{/* Spreadsheet: FAQ Sheet */}
<div className="bg-surface border border-outline-variant rounded-xl p-lg file-card-hover transition-all flex flex-col group">
<div className="flex justify-between items-start mb-lg">
<div className="p-sm bg-surface-container-highest rounded-lg text-[#1D6F42]">
<span className="material-symbols-outlined text-[32px]" data-icon="description">description</span>
</div>
<div className="px-sm py-xs bg-tertiary-fixed text-on-tertiary-fixed rounded font-label-sm flex items-center gap-xs">
<span className="material-symbols-outlined text-[14px] pulse-ai" data-icon="hourglass_empty">hourglass_empty</span>
                        Processing
                    </div>
</div>
<h4 className="font-headline-md text-on-surface mb-xs truncate" title="FAQ_Sheet.xlsx">FAQ_Sheet.xlsx</h4>
<p className="font-body-sm text-on-surface-variant mb-lg">Added today • 450 KB</p>
<div className="mt-auto flex justify-between items-center pt-md border-t border-outline-variant">
<p className="font-label-sm text-outline">XLSX Spreadsheet</p>
<div className="flex gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
<button className="p-xs hover:bg-surface-container-low rounded text-error"><span className="material-symbols-outlined text-[20px]" data-icon="cancel">cancel</span></button>
</div>
</div>
</div>
{/* Placeholder for Empty State/Call to Action */}
<button className="border-2 border-dashed border-outline-variant rounded-xl p-lg flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-all group min-h-[220px]" onClick="openModal()">
<div className="p-md rounded-full bg-surface-container-highest mb-md group-hover:scale-110 transition-transform">
<span className="material-symbols-outlined text-[40px]" data-icon="upload_file">upload_file</span>
</div>
<p className="font-label-md">Add New Intelligence</p>
<p className="font-body-sm opacity-60">PDF, XLS, CSV, or Website URL</p>
</button>
</div>
</div>
    </>
  );
}


