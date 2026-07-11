import React from 'react';

export default function NotificationsPage() {
  return (
    <>
<div className="pt-xxl pb-xxl px-lg max-w-7xl mx-auto">
<div className="grid grid-cols-1 md:grid-cols-3 gap-lg mt-xl">
{/* Mock Dashboard Content */}
<div className="md:col-span-2 space-y-lg">
<div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant">
<h2 className="font-headline-md text-headline-md mb-md">System Overview</h2>
<div className="h-64 relative rounded-lg overflow-hidden mb-lg">
<div className="relative z-10 p-lg h-full flex flex-col justify-between">
<div className="flex justify-between items-start">
<div>
<p className="font-label-sm text-label-sm text-on-surface-variant">Active AI Employees</p>
<p className="font-display text-display text-primary">12</p>
</div>
<div className="bg-primary-container text-on-primary-container px-md py-xs rounded-lg font-label-sm text-label-sm">
                                    Normal Load
                                </div>
</div>
<div className="flex gap-sm">
<div className="h-1 bg-primary w-1/4 rounded-full"></div>
<div className="h-1 bg-outline-variant w-3/4 rounded-full"></div>
</div>
</div>
</div>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
<div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant">
<p className="font-label-md text-label-md text-on-surface-variant mb-xs">Daily Conversations</p>
<p className="font-headline-md text-headline-md text-on-surface">1,482</p>
</div>
<div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant">
<p className="font-label-md text-label-md text-on-surface-variant mb-xs">Customer Sentiment</p>
<p className="font-headline-md text-headline-md text-on-surface">94% Positive</p>
</div>
</div>
</div>
{/* Side Quick Stats */}
<div className="space-y-lg">
<div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant">
<h3 className="font-label-md text-label-md font-bold mb-md uppercase tracking-wider">Upcoming Tasks</h3>
<ul className="space-y-md">
<li className="flex items-center gap-sm">
<span className="w-2 h-2 rounded-full bg-primary"></span>
<span className="font-body-sm text-body-sm">Sync with CRM</span>
</li>
<li className="flex items-center gap-sm">
<span className="w-2 h-2 rounded-full bg-tertiary"></span>
<span className="font-body-sm text-body-sm">Capacity Review</span>
</li>
</ul>
</div>
<div className="relative rounded-xl overflow-hidden h-48 group border border-outline-variant">
<div className="absolute inset-0 bg-cover bg-center" data-alt="A professional architectural photograph of a high-tech server room with glowing blue LED strips on sleek metallic server racks. The environment is clean, futuristic, and industrial, capturing the scale of data processing power. Soft atmospheric haze and lens flares add depth and a sense of sophisticated machinery." style={{}}></div>
<div className="absolute inset-0 bg-on-background/40 flex items-end p-md">
<p className="font-label-sm text-label-sm text-surface-container-lowest">Server Status: Optimized</p>
</div>
</div>
</div>
</div>
</div>
    </>
  );
}


