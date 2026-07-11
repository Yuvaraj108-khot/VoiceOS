import { useState, useEffect } from 'react';
import { callsService } from '../services/calls';
import type { CallDetails } from '../services/calls';
export default function LiveCallCenterPage() {
  const [callData, setCallData] = useState<CallDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLiveCall = async () => {
      try {
        const data = await callsService.getLiveCall();
        setCallData(data);
      } catch (error) {
        console.error("Failed to fetch live call", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLiveCall();
  }, []);

  if (loading) {
    return <div className="pt-xxxl pb-xxxl text-center text-on-surface-variant flex-grow w-full max-w-[1440px] mx-auto">Connecting to live call stream...</div>;
  }

  if (!callData) {
    return <div className="pt-xxxl pb-xxxl text-center text-on-surface-variant flex-grow w-full max-w-[1440px] mx-auto">No active calls right now.</div>;
  }

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
<h2 className="font-headline-lg text-headline-lg text-on-surface">Inbound call from {callData.callerNumber}</h2>
<p className="font-body-md text-body-md text-on-surface-variant">Active duration: {callData.duration} • AI Agent ID: {callData.agentId}</p>
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

{callData.transcript.map((msg, index) => {
  const isAI = msg.role === 'AI';
  return (
    <div key={index} className={`flex gap-md max-w-[80%] ${!isAI ? 'ml-auto flex-row-reverse' : ''}`}>
    <div className={`w-8 h-8 rounded flex-shrink-0 flex items-center justify-center ${isAI ? 'bg-primary-container' : 'bg-surface-container-highest'}`}>
    <span className={`material-symbols-outlined text-[18px] ${isAI ? 'text-on-primary-container' : 'text-on-surface-variant'}`} style={isAI ? {"fontVariationSettings":"'FILL' 1"} : {}}>{isAI ? 'smart_toy' : 'person'}</span>
    </div>
    <div className={`space-y-xs ${!isAI ? 'text-right' : ''}`}>
    <span className="font-label-sm text-label-sm text-outline">{isAI ? 'VoiceOS (AI)' : 'Caller'} • {msg.timestamp}</span>
    <div className={`${isAI ? 'bg-surface-container-low p-md rounded-xl rounded-tl-none border border-outline-variant' : 'bg-primary text-on-primary p-md rounded-xl rounded-tr-none'}`}>
    <p className={`font-body-md text-body-md ${isAI ? 'text-on-surface' : ''}`}>{msg.message}</p>
    </div>
    </div>
    </div>
  );
})}

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
<p className="font-body-md text-body-md text-on-surface-variant">Processing next response...</p>
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
<span className={`font-label-md text-label-md flex items-center gap-xs ${callData.sentiment === 'Positive' ? 'text-primary' : callData.sentiment === 'Negative' ? 'text-error' : 'text-on-surface-variant'}`}>
<span className="material-symbols-outlined text-[16px]">{callData.sentiment === 'Positive' ? 'mood' : callData.sentiment === 'Negative' ? 'mood_bad' : 'sentiment_neutral'}</span>
                                        {callData.sentiment}
                                    </span>
</div>
<div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
<div className={`h-full rounded-full ${callData.sentiment === 'Positive' ? 'bg-primary' : callData.sentiment === 'Negative' ? 'bg-error' : 'bg-outline'}`} style={{"width":`${callData.sentimentScore}%`}}></div>
</div>
</div>
{/* Intent */}
<div className="bg-tertiary-fixed rounded-lg p-md border border-outline-variant">
<span className="font-label-sm text-label-sm text-on-tertiary-fixed-variant block mb-xs">DETECTED INTENT</span>
<div className="flex items-center gap-sm">
<span className="material-symbols-outlined text-on-tertiary-fixed">category</span>
<span className="font-headline-md text-[18px] text-on-tertiary-fixed font-bold">{callData.intent}</span>
</div>
<div className="mt-xs text-on-tertiary-fixed-variant font-body-sm text-body-sm">
                                    Confidence: {callData.confidence}%
                                </div>
</div>
</div>
</div>
<hr className="border-outline-variant"/>
{/* Metadata */}
<div className="space-y-sm">
<div className="flex justify-between items-center">
<span className="font-body-sm text-body-sm text-outline">Caller Name</span>
<span className="font-label-md text-label-md text-on-surface">{callData.callerName}</span>
</div>
<div className="flex justify-between items-center">
<span className="font-body-sm text-body-sm text-outline">Account Status</span>
<span className="bg-secondary-container text-on-secondary-container px-xs py-[2px] rounded text-[10px] font-bold uppercase">{callData.accountStatus}</span>
</div>
<div className="flex justify-between items-center">
<span className="font-body-sm text-body-sm text-outline">Language</span>
<span className="font-label-md text-label-md text-on-surface">{callData.language}</span>
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
                            "{callData.summary}"
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


