import React from 'react';

export default function LiveCallCenterPage() {
  return (
    <>
<div className="flex-grow pt-xxl pb-xxl px-gutter max-w-[1440px] mx-auto w-full">
{/* Live Header Info */}
<div className="mt-xl mb-lg flex flex-col md:flex-row md:items-end justify-between gap-md">
<div>
<div className="flex items-center gap-sm mb-xs">
<div className="w-3 h-3 bg-primary rounded-full pulse-indicator"></div>
<span className="font-label-sm text-label-sm text-primary uppercase tracking-widest">Live Session</span>
</div>
<h2 className="font-headline-lg text-headline-lg text-on-surface">Inbound call from +1 (555) 0123</h2>
<p className="font-body-md text-body-md text-on-surface-variant">Active duration: 04:12 • AI Agent ID: Alpha-9</p>
</div>
<div className="flex gap-sm">
<button className="flex items-center gap-xs px-md py-sm bg-surface border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-all">
<span className="material-symbols-outlined text-[20px]">headphones</span>
                    Listen Live
                </button>
<button className="flex items-center gap-xs px-md py-sm bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:brightness-110 transition-all shadow-sm">
<span className="material-symbols-outlined text-[20px]">transfer_within_a_station</span>
                    Take Over
                </button>
</div>
</div>
{/* Mission Control Grid */}
<div className="grid grid-cols-12 gap-gutter">
{/* Left Column: Real-time Transcript */}
<div className="col-span-12 lg:col-span-8 space-y-gutter">
<div className="bg-surface border border-outline-variant rounded-xl overflow-hidden flex flex-col h-[600px]">
<div className="px-lg py-md border-b border-outline-variant bg-surface flex justify-between items-center">
<h3 className="font-label-md text-label-md text-on-surface-variant flex items-center gap-xs">
<span className="material-symbols-outlined text-[18px]">notes</span>
                            REAL-TIME TRANSCRIPT
                        </h3>
<div className="flex items-center gap-xs">
<span className="w-2 h-2 rounded-full bg-error"></span>
<span className="font-label-sm text-label-sm text-on-surface-variant">Recording</span>
</div>
</div>
<div className="flex-grow overflow-y-auto p-lg space-y-lg transcript-scroll" id="transcript">
{/* AI Message */}
<div className="flex gap-md max-w-[80%]">
<div className="w-8 h-8 rounded bg-primary-container flex-shrink-0 flex items-center justify-center">
<span className="material-symbols-outlined text-on-primary-container text-[18px]" style={{"fontVariationSettings":"'FILL' 1"}}>smart_toy</span>
</div>
<div className="space-y-xs">
<span className="font-label-sm text-label-sm text-outline">VoiceOS (AI) • 10:02 AM</span>
<div className="bg-surface-container-low p-md rounded-xl rounded-tl-none border border-outline-variant">
<p className="font-body-md text-body-md text-on-surface">Hello! Thank you for calling VoiceOS customer support. This is Alpha-9. How can I help you today?</p>
</div>
</div>
</div>
{/* User Message */}
<div className="flex gap-md max-w-[80%] ml-auto flex-row-reverse">
<div className="w-8 h-8 rounded bg-surface-container-highest flex-shrink-0 flex items-center justify-center">
<span className="material-symbols-outlined text-on-surface-variant text-[18px]">person</span>
</div>
<div className="space-y-xs text-right">
<span className="font-label-sm text-label-sm text-outline">Caller • 10:02 AM</span>
<div className="bg-primary text-on-primary p-md rounded-xl rounded-tr-none">
<p className="font-body-md text-body-md">Hi, I'd like to schedule an appointment for a consultation next Tuesday afternoon.</p>
</div>
</div>
</div>
{/* AI Message */}
<div className="flex gap-md max-w-[80%]">
<div className="w-8 h-8 rounded bg-primary-container flex-shrink-0 flex items-center justify-center">
<span className="material-symbols-outlined text-on-primary-container text-[18px]" style={{"fontVariationSettings":"'FILL' 1"}}>smart_toy</span>
</div>
<div className="space-y-xs">
<span className="font-label-sm text-label-sm text-outline">VoiceOS (AI) • 10:03 AM</span>
<div className="bg-surface-container-low p-md rounded-xl rounded-tl-none border border-outline-variant">
<p className="font-body-md text-body-md text-on-surface">I can certainly help with that. Let me check the availability for Tuesday. We have slots at 2:00 PM and 4:30 PM. Would either of those work for you?</p>
</div>
</div>
</div>
{/* User Message */}
<div className="flex gap-md max-w-[80%] ml-auto flex-row-reverse">
<div className="w-8 h-8 rounded bg-surface-container-highest flex-shrink-0 flex items-center justify-center">
<span className="material-symbols-outlined text-on-surface-variant text-[18px]">person</span>
</div>
<div className="space-y-xs text-right">
<span className="font-label-sm text-label-sm text-outline">Caller • 10:04 AM</span>
<div className="bg-primary text-on-primary p-md rounded-xl rounded-tr-none">
<p className="font-body-md text-body-md">2:00 PM sounds great. What do I need to bring?</p>
</div>
</div>
</div>
{/* AI Preview (Pulsing) */}
<div className="flex gap-md max-w-[80%] opacity-80 italic">
<div className="w-8 h-8 rounded bg-secondary-container flex-shrink-0 flex items-center justify-center animate-pulse">
<span className="material-symbols-outlined text-on-secondary-container text-[18px]">auto_awesome</span>
</div>
<div className="space-y-xs">
<div className="flex items-center gap-xs">
<span className="font-label-sm text-label-sm text-primary">AI Preview...</span>
<div className="flex gap-1">
<span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{"animationDelay":"0s"}}></span>
<span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{"animationDelay":"0.2s"}}></span>
<span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{"animationDelay":"0.4s"}}></span>
</div>
</div>
<div className="bg-surface-container p-md rounded-xl rounded-tl-none border border-outline-variant border-dashed">
<p className="font-body-md text-body-md text-on-surface-variant">Perfect, I've reserved Tuesday at 2:00 PM for you. You'll just need to bring a valid ID and any documents related to your inquiry...</p>
</div>
</div>
</div>
</div>
<div className="px-lg py-md border-t border-outline-variant bg-surface-container-lowest flex items-center justify-between">
<div className="flex items-center gap-sm">
<span className="font-label-sm text-label-sm text-on-surface-variant">Press SPACE to talk directly</span>
</div>
<button className="text-primary font-label-md text-label-md flex items-center gap-xs hover:underline">
<span className="material-symbols-outlined text-[18px]">history</span>
                            View CRM History
                        </button>
</div>
</div>
</div>
{/* Right Column: Live Analysis */}
<div className="col-span-12 lg:col-span-4 space-y-gutter">
{/* Sentiment & Intent Card */}
<div className="bg-surface border border-outline-variant rounded-xl p-lg space-y-lg">
<div>
<h3 className="font-label-md text-label-md text-on-surface-variant mb-md uppercase tracking-wider">Live Analysis</h3>
<div className="space-y-md">
{/* Sentiment */}
<div>
<div className="flex justify-between items-center mb-xs">
<span className="font-body-sm text-body-sm text-outline">Sentiment</span>
<span className="font-label-md text-label-md text-primary flex items-center gap-xs">
<span className="material-symbols-outlined text-[16px]">mood</span>
                                        Positive
                                    </span>
</div>
<div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
<div className="h-full bg-primary rounded-full" style={{"width":"85%"}}></div>
</div>
</div>
{/* Intent */}
<div className="bg-tertiary-fixed rounded-lg p-md border border-outline-variant">
<span className="font-label-sm text-label-sm text-on-tertiary-fixed-variant block mb-xs">DETECTED INTENT</span>
<div className="flex items-center gap-sm">
<span className="material-symbols-outlined text-on-tertiary-fixed">calendar_today</span>
<span className="font-headline-md text-[18px] text-on-tertiary-fixed font-bold">Schedule Appointment</span>
</div>
<div className="mt-xs text-on-tertiary-fixed-variant font-body-sm text-body-sm">
                                    Confidence: 98.4%
                                </div>
</div>
</div>
</div>
<hr className="border-outline-variant"/>
{/* Metadata */}
<div className="space-y-sm">
<div className="flex justify-between items-center">
<span className="font-body-sm text-body-sm text-outline">Caller Name</span>
<span className="font-label-md text-label-md text-on-surface">Mark Stevenson (Unverified)</span>
</div>
<div className="flex justify-between items-center">
<span className="font-body-sm text-body-sm text-outline">Account Status</span>
<span className="bg-secondary-container text-on-secondary-container px-xs py-[2px] rounded text-[10px] font-bold uppercase">Standard</span>
</div>
<div className="flex justify-between items-center">
<span className="font-body-sm text-body-sm text-outline">Language</span>
<span className="font-label-md text-label-md text-on-surface">English (US)</span>
</div>
</div>
</div>
{/* Call Summary (Instant) */}
<div className="bg-surface border border-outline-variant rounded-xl p-lg">
<div className="flex justify-between items-center mb-md">
<h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Draft Summary</h3>
<button className="text-primary hover:text-primary-container transition-colors">
<span className="material-symbols-outlined">refresh</span>
</button>
</div>
<div className="bg-surface-container-low rounded-lg p-md border border-outline-variant border-dashed">
<p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed italic">
                            "Caller requested a consultation appointment for next Tuesday. Agent offered 2:00 PM and 4:30 PM slots. Caller selected 2:00 PM. Agent is currently explaining requirements..."
                        </p>
</div>
<button className="w-full mt-lg py-sm bg-surface border border-outline text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-container-highest transition-all flex justify-center items-center gap-xs">
<span className="material-symbols-outlined text-[20px]">auto_fix</span>
                        Generate Full Report
                    </button>
</div>
{/* Related Actions */}
<div className="grid grid-cols-2 gap-sm">
<div className="bg-surface border border-outline-variant rounded-xl p-md flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary transition-all group">
<span className="material-symbols-outlined text-outline group-hover:text-primary mb-xs">mail</span>
<span className="font-label-sm text-label-sm text-on-surface-variant">Email Link</span>
</div>
<div className="bg-surface border border-outline-variant rounded-xl p-md flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary transition-all group">
<span className="material-symbols-outlined text-outline group-hover:text-primary mb-xs">sms</span>
<span className="font-label-sm text-label-sm text-on-surface-variant">Send SMS</span>
</div>
</div>
</div>
</div>
</div>
    </>
  );
}


