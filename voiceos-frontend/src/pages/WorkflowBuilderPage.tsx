import React from 'react';

export default function WorkflowBuilderPage() {
  return (
    <>
<div className="pt-xxxl px-md max-w-lg mx-auto">
{/* Workflow Info */}
<section className="mb-xl bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm">
<div className="flex justify-between items-start mb-sm">
<div>
<span className="font-label-sm text-label-sm text-primary uppercase tracking-widest">Active Workflow</span>
<h2 className="font-headline-md text-headline-md-mobile text-on-surface">Inbound Receptionist</h2>
</div>
<span className="material-symbols-outlined text-on-surface-variant hover:bg-surface-container-low p-xs rounded-lg transition-colors" data-icon="more_vert">more_vert</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant">Triggered by incoming voice calls from unknown numbers.</p>
</section>
{/* Vertical Node Flow */}
<div className="relative flex flex-col items-center gap-xl pb-xxl">
{/* Node 1: Trigger */}
<div className="relative w-full group">
<div className="bg-surface-container-lowest border-2 border-primary p-md rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-grab">
<div className="flex items-center gap-md">
<div className="bg-primary text-on-primary p-sm rounded-lg flex items-center justify-center">
<span className="material-symbols-outlined" data-icon="call">call</span>
</div>
<div className="flex-1">
<span className="font-label-sm text-label-sm text-primary">Trigger</span>
<h3 className="font-label-md text-label-md text-on-surface">Incoming Call</h3>
</div>
<span className="material-symbols-outlined text-outline-variant" data-icon="drag_indicator">drag_indicator</span>
</div>
</div>
</div>
{/* Node 2: Condition */}
<div className="relative w-full node-connector group">
<div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-grab">
<div className="flex items-center gap-md">
<div className="bg-secondary-container text-on-secondary-container p-sm rounded-lg flex items-center justify-center">
<span className="material-symbols-outlined" data-icon="translate">translate</span>
</div>
<div className="flex-1">
<span className="font-label-sm text-label-sm text-secondary">Condition</span>
<h3 className="font-label-md text-label-md text-on-surface">Identify Language</h3>
</div>
<span className="material-symbols-outlined text-outline-variant" data-icon="drag_indicator">drag_indicator</span>
</div>
<div className="mt-md pt-md border-t border-outline-variant flex gap-sm">
<div className="flex-1 bg-surface-container px-sm py-xs rounded text-center">
<span className="font-label-sm text-label-sm text-on-surface-variant">Default: English</span>
</div>
</div>
</div>
</div>
{/* Node 3: Action */}
<div className="relative w-full node-connector group">
<div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-grab">
<div className="flex items-center gap-md">
<div className="bg-tertiary text-on-tertiary p-sm rounded-lg flex items-center justify-center">
<span className="material-symbols-outlined" data-icon="smart_toy">smart_toy</span>
</div>
<div className="flex-1">
<span className="font-label-sm text-label-sm text-tertiary">Action</span>
<h3 className="font-label-md text-label-md text-on-surface">AI Response</h3>
</div>
<span className="material-symbols-outlined text-outline-variant" data-icon="drag_indicator">drag_indicator</span>
</div>
<div className="mt-md text-sm text-on-surface-variant font-body-sm italic">
                        "Hello! How can I help you book today?"
                    </div>
</div>
</div>
{/* Node 4: Integration */}
<div className="relative w-full node-connector group">
<div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-grab">
<div className="flex items-center gap-md">
<div className="bg-inverse-surface text-inverse-on-surface p-sm rounded-lg flex items-center justify-center">
<span className="material-symbols-outlined" data-icon="calendar_today">calendar_today</span>
</div>
<div className="flex-1">
<span className="font-label-sm text-label-sm text-outline">Integration</span>
<h3 className="font-label-md text-label-md text-on-surface">Book Appointment</h3>
</div>
<span className="material-symbols-outlined text-outline-variant" data-icon="drag_indicator">drag_indicator</span>
</div>
<div className="mt-md flex items-center gap-sm">
<div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center overflow-hidden">
<img className="w-3 h-3" data-alt="Official minimal Google Calendar icon logo in vector style, clean colors." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBxHOLrjxkFaT497Ic9bf0RIEJMKy4MM5TWIOq8TBaveEGYtNnQXvZe_xj1iVL4F0znKigQQFF1qjdZZ6R0EdMQI30kxmBjPgOQM2Vi7dtMK3pzzKR7Lm2xEN2Dc_eNDOFv1J0-k3FdAoasaXc0S9AGIP-Mljzm-ug6UqhzFE58I1oO9UXwK0XiVzJ2oOIdmyEhzAXFC54H04E6IK6cCqex_fZvps9pEj9dg28fPpBjUupnLBNrir_UlQ"/>
</div>
<span className="font-body-sm text-body-sm text-on-surface-variant">Syncs with Workspace</span>
</div>
</div>
</div>
{/* Node 5: Integration/Message */}
<div className="relative w-full node-connector group">
<div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-grab">
<div className="flex items-center gap-md">
<div className="bg-green-600 text-white p-sm rounded-lg flex items-center justify-center">
<span className="material-symbols-outlined" data-icon="chat">chat</span>
</div>
<div className="flex-1">
<span className="font-label-sm text-label-sm text-green-700">Notification</span>
<h3 className="font-label-md text-label-md text-on-surface">Send Confirmation</h3>
</div>
<span className="material-symbols-outlined text-outline-variant" data-icon="drag_indicator">drag_indicator</span>
</div>
<div className="mt-md flex items-center gap-sm bg-surface-container-low p-sm rounded-lg">
<span className="material-symbols-outlined text-green-600 scale-75" data-icon="check_circle">check_circle</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">WhatsApp API Connected</span>
</div>
</div>
</div>
{/* Add New Node Button */}
<button className="relative node-connector mt-sm w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg transition-transform active:scale-90 z-10">
<span className="material-symbols-outlined" data-icon="add">add</span>
</button>
</div>
</div>
    </>
  );
}


