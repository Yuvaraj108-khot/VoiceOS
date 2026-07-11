import React from 'react';

export default function CreateEmployee13Page() {
  return (
    <>
<div className="pt-xxxl pb-xxxl px-md md:px-gutter max-w-5xl mx-auto">
{/* Progress Indicator Section */}
<div className="mt-xl mb-xxl">
<div className="flex justify-between items-center mb-sm">
<span className="font-label-md text-label-md text-primary">Step 1 of 4</span>
<span className="font-label-md text-label-md text-on-surface-variant">Personality &amp; Voice</span>
</div>
<div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
<div className="bg-primary h-full w-1/4 transition-all duration-500 ease-out"></div>
</div>
</div>
{/* Layout Grid: Form (Left) & Preview/Visuals (Right) */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-xxl">
{/* Primary Form Column */}
<div className="lg:col-span-7 space-y-xl">
<section>
<h2 className="font-headline-lg text-headline-lg-mobile text-on-surface mb-sm">Define Personality</h2>
<p className="font-body-md text-body-md text-on-surface-variant mb-xl">Give your AI employee a name and a baseline role to shape how it interacts with customers.</p>
<div className="space-y-lg">
{/* Employee Name */}
<div className="flex flex-col gap-xs">
<label className="font-label-md text-label-md text-on-surface" htmlFor="name">Employee Name</label>
<input className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-xl text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all" id="name" placeholder="e.g. Sarah Jennings" type="text"/>
</div>
{/* Primary Role */}
<div className="flex flex-col gap-xs">
<label className="font-label-md text-label-md text-on-surface" htmlFor="role">Primary Role</label>
<div className="relative">
<select className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-xl text-body-md appearance-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" id="role">
<option value="">Select a specialty...</option>
<option value="customer-support">Customer Support Lead</option>
<option value="sales-dev">Sales Development Rep</option>
<option value="tech-concierge">Technical Concierge</option>
<option value="exec-assistant">Executive Assistant</option>
</select>
<span className="material-symbols-outlined absolute right-3 top-2 pointer-events-none text-outline">expand_more</span>
</div>
</div>
{/* Greeting Script */}
<div className="flex flex-col gap-xs">
<label className="font-label-md text-label-md text-on-surface" htmlFor="greeting">Greeting Script</label>
<textarea className="w-full px-md py-md bg-surface-container-lowest border border-outline-variant rounded-xl text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none" id="greeting" placeholder="How should your AI answer the phone or start a chat?" rows={4}></textarea>
<p className="font-label-sm text-label-sm text-outline">Character count: 0/500</p>
</div>
</div>
</section>
{/* Voice Selector Section */}
<section className="pt-lg border-t border-outline-variant">
<h3 className="font-headline-md text-on-surface mb-md">Voice Profile</h3>
<div className="grid grid-cols-1 md:grid-cols-2 gap-md">
{/* Voice Card 1 (Selected) */}
<div className="group relative flex items-center p-md border-2 border-primary bg-primary-fixed/10 rounded-xl cursor-pointer transition-all">
<div className="flex-1">
<p className="font-label-md text-on-primary-fixed">Oliver</p>
<p className="font-label-sm text-on-primary-fixed-variant">British, Warm &amp; Trustworthy</p>
</div>
<button className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">
<span className="material-symbols-outlined" style={{"fontVariationSettings":"'FILL' 1"}}>play_arrow</span>
</button>
<div className="absolute -top-2 -right-2 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center border-2 border-surface">
<span className="material-symbols-outlined text-[12px]">check</span>
</div>
</div>
{/* Voice Card 2 */}
<div className="group flex items-center p-md border border-outline-variant bg-surface-container-lowest rounded-xl cursor-pointer hover:border-primary hover:bg-surface-container-low transition-all">
<div className="flex-1">
<p className="font-label-md text-on-surface">Sophia</p>
<p className="font-label-sm text-on-surface-variant">American, Direct &amp; Professional</p>
</div>
<button className="w-10 h-10 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
<span className="material-symbols-outlined">play_arrow</span>
</button>
</div>
{/* Voice Card 3 */}
<div className="group flex items-center p-md border border-outline-variant bg-surface-container-lowest rounded-xl cursor-pointer hover:border-primary hover:bg-surface-container-low transition-all">
<div className="flex-1">
<p className="font-label-md text-on-surface">Kael</p>
<p className="font-label-sm text-on-surface-variant">Australian, Friendly &amp; Casual</p>
</div>
<button className="w-10 h-10 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
<span className="material-symbols-outlined">play_arrow</span>
</button>
</div>
{/* Voice Card 4 */}
<div className="group flex items-center p-md border border-outline-variant bg-surface-container-lowest rounded-xl cursor-pointer hover:border-primary hover:bg-surface-container-low transition-all">
<div className="flex-1">
<p className="font-label-md text-on-surface">Elena</p>
<p className="font-label-sm text-on-surface-variant">Spanish (Eng Accent), Sophisticated</p>
</div>
<button className="w-10 h-10 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
<span className="material-symbols-outlined">play_arrow</span>
</button>
</div>
</div>
</section>
{/* Navigation Buttons */}
<div className="flex justify-between items-center pt-xl">
<button className="px-xl py-md text-on-surface-variant font-label-md hover:text-primary transition-colors flex items-center gap-xs">
            Cancel
          </button>
<button className="bg-primary text-white px-xxl py-md rounded-xl font-label-md shadow-sm hover:shadow-md hover:bg-primary-container transition-all active:scale-95">
            Next: Training Data
          </button>
</div>
</div>
{/* Preview Column (Visual/Decorative) */}
<div className="lg:col-span-5 hidden lg:block">
<div className="sticky top-xxxl space-y-lg">
{/* Live Preview Card */}
<div className="bg-surface-container-lowest border border-outline-variant rounded-full overflow-hidden p-gutter shadow-sm">
<div className="flex items-center gap-md mb-xl">
<div className="w-12 h-12 rounded-full bg-primary-fixed-dim overflow-hidden flex-shrink-0 flex items-center justify-center relative">
<span className="material-symbols-outlined text-primary-fixed text-4xl">face</span>
{/* AI Pulse Indicator */}
<div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
</div>
<div>
<h4 className="font-label-md text-on-surface" id="preview-name">New AI Employee</h4>
<p className="font-label-sm text-outline" id="preview-role">Defining role...</p>
</div>
</div>
<div className="bg-surface-container-low p-md rounded-xl mb-xl">
<div className="flex gap-xs mb-xs">
<div className="w-1 h-1 rounded-full bg-primary"></div>
<div className="w-1 h-1 rounded-full bg-primary/40"></div>
<div className="w-1 h-1 rounded-full bg-primary/20"></div>
</div>
<p className="font-body-sm italic text-on-surface-variant" id="preview-greeting">"Your personalized greeting will appear here as you type..."</p>
</div>
{/* Visualization Asset */}
<div className="relative h-48 rounded-xl overflow-hidden bg-on-background flex items-center justify-center">
<div className="relative z-10 flex flex-col items-center text-center px-lg">
<span className="material-symbols-outlined text-primary text-xxxl mb-sm" style={{"fontVariationSettings":"'FILL' 1"}}>mic</span>
<p className="font-label-sm text-white uppercase tracking-widest opacity-80">Voice Engine Ready</p>
</div>
</div>
</div>
{/* Feature Tip */}
<div className="p-md bg-secondary-fixed text-on-secondary-fixed rounded-xl flex gap-md">
<span className="material-symbols-outlined text-primary">lightbulb</span>
<div className="space-y-xs">
<p className="font-label-md font-bold">Pro Tip</p>
<p className="font-body-sm">Highly descriptive greeting scripts help the AI better understand the emotional tone you want it to adopt.</p>
</div>
</div>
</div>
</div>
</div>
</div>
    </>
  );
}


