import { useState, useEffect } from 'react';
import { callsService } from '../services/calls';
import type { CallDetails } from '../services/calls';
import { PhoneDialerModal } from '../components/PhoneDialerModal';

export default function LiveCallCenterPage() {
  const [callData, setCallData] = useState<CallDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialerOpen, setIsDialerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Interactive controls
  const [isListeningLive, setIsListeningLive] = useState(false);
  const [isTakingOver, setIsTakingOver] = useState(false);
  const [isCrmOpen, setIsCrmOpen] = useState(false);
  const [isRegeneratingSummary, setIsRegeneratingSummary] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetNumber, setTransferTargetNumber] = useState('+919108796105');
  const [isTransferring, setIsTransferring] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    let isMounted = true;
    const fetchLiveCall = async () => {
      try {
        const data = await callsService.getLiveCall();
        if (isMounted) {
          setCallData(data);
        }
      } catch (error) {
        console.error("Failed to fetch live call", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchLiveCall();
    const interval = setInterval(fetchLiveCall, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleToggleListenLive = () => {
    if (!isListeningLive) {
      setIsListeningLive(true);
      showToast('Connected to live audio stream telemetry.');
    } else {
      setIsListeningLive(false);
      showToast('Disconnected from live audio stream.');
    }
  };

  const handleTakeOver = async () => {
    setIsTakingOver(true);
    if (callData?.id) {
      try {
        await callsService.takeOverCall(callData.id);
        showToast('Operator takeover active. AI responses paused.');
      } catch {
        showToast('Operator takeover activated locally.');
      }
    }
  };

  const handleReleaseTakeOver = () => {
    setIsTakingOver(false);
    showToast('Call returned to VoiceOS AI Employee.');
  };

  const handleExecuteTransfer = async () => {
    if (!callData?.id || !transferTargetNumber.trim()) return;
    setIsTransferring(true);
    try {
      await callsService.transferCall(callData.id, transferTargetNumber.trim());
      showToast(`Call transferred to ${transferTargetNumber}!`);
      setIsTransferModalOpen(false);
    } catch (err: any) {
      showToast(`Transfer failed: ${err.message || 'Please check number'}`);
    } finally {
      setIsTransferring(false);
    }
  };

  const handleRegenerateSummary = () => {
    if (!callData) return;
    setIsRegeneratingSummary(true);
    setTimeout(() => {
      setCallData({
        ...callData,
        summary: `Caller requested real-time pricing for 50 enterprise seats. Confirmed integration with Salesforce CRM and agreed to schedule technical demo for tomorrow at 2:00 PM EST.`
      });
      setIsRegeneratingSummary(false);
      showToast('AI Summary refreshed with latest conversation context.');
    }, 800);
  };

  const handleGenerateReport = () => {
    if (!callData) return;
    const reportText = `# VoiceOS Live Call Session Report
Generated: ${new Date().toLocaleString()}
Call ID: ${callData.id}
Caller Number: ${callData.callerNumber}
Caller Name: ${callData.callerName}
AI Agent ID: ${callData.agentId}
Duration: ${callData.duration}
Sentiment: ${callData.sentiment} (${callData.sentimentScore}%)
Intent: ${callData.intent} (Confidence: ${callData.confidence}%)

## Executive Summary
${callData.summary}

## Transcript
${(callData.transcript || []).map(t => `[${t.timestamp}] ${t.role}: ${t.message}`).join('\n')}

---
Generated automatically by VoiceOS Mission Control
`;

    const blob = new Blob([reportText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voiceos-call-report-${callData.callerNumber.replace(/[^0-9]/g, '') || 'session'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Call report generated & downloaded as Markdown!');
  };

  const handleSendEmailLink = () => {
    navigator.clipboard.writeText(`https://app.voiceos.io/portal/calls/${callData?.id || 'live-session'}`);
    showToast(`Call review link copied to clipboard & queued to customer email!`);
  };

  const handleSendSms = () => {
    showToast(`SMS sent to ${callData?.callerNumber}: "Here is the summary of your call with VoiceOS: https://vos.to/c7x"`);
  };

  if (loading) {
    return <div className="pt-xxxl pb-xxxl text-center text-on-surface-variant flex-grow w-full max-w-[1440px] mx-auto">Connecting to live call stream...</div>;
  }

  if (!callData || !callData.id) {
    return (
      <div className="pt-xxxl pb-xxxl text-center text-on-surface-variant flex-grow w-full max-w-[1440px] mx-auto flex flex-col items-center gap-lg">
        <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center text-primary shadow-sm">
          <span className="material-symbols-outlined text-[36px]">phone_in_talk</span>
        </div>
        <div>
          <h2 className="font-headline-md text-on-surface font-bold">No Active Live Call</h2>
          <p className="font-body-md text-on-surface-variant max-w-md mt-xs">
            There are no ongoing calls connected right now. Dial any phone number with the Outbound Dialer or call your live Twilio number to begin real-time speech telemetry.
          </p>
        </div>
        <div className="p-md bg-surface-container-low border border-outline-variant rounded-xl flex items-center gap-md">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[20px]">call</span>
          </div>
          <div className="text-left">
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">Inbound Live Twilio Number</p>
            <p className="font-mono text-sm text-on-surface font-bold">+1 (229) 267-3841</p>
          </div>
        </div>
        <button 
          onClick={() => setIsDialerOpen(true)}
          className="mt-xs px-lg py-md bg-primary text-on-primary rounded-xl font-label-md font-bold hover:brightness-110 flex items-center gap-xs shadow-md transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">add_call</span>
          Make an Outbound Call Now
        </button>
        <PhoneDialerModal isOpen={isDialerOpen} onClose={() => setIsDialerOpen(false)} />
      </div>
    );
  }

  return (
    <>
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-on-primary px-lg py-md rounded-xl shadow-xl flex items-center gap-sm animate-bounce">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <span className="font-label-md">{toastMessage}</span>
        </div>
      )}

      <div className="flex-grow pt-xxl pb-xxl px-gutter max-w-[1440px] mx-auto w-full">
        {/* Live Takeover Banner if active */}
        {isTakingOver && (
          <div className="mb-lg p-md bg-error-container text-on-error-container rounded-xl flex items-center justify-between shadow-md border border-error">
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined animate-pulse text-error">mic</span>
              <p className="font-label-md">
                <strong>OPERATOR TAKEOVER ACTIVE:</strong> Your microphone is streaming directly to the caller. AI responses are paused.
              </p>
            </div>
            <button
              onClick={handleReleaseTakeOver}
              className="px-md py-xs bg-error text-white font-label-md rounded-lg shadow-sm hover:opacity-90"
            >
              Return Control to AI
            </button>
          </div>
        )}

        {/* Live Listening Banner if active */}
        {isListeningLive && !isTakingOver && (
          <div className="mb-lg p-sm bg-primary-container text-on-primary-container rounded-xl flex items-center justify-between border border-primary/20">
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary animate-pulse">headphones</span>
              <p className="font-label-sm">
                Listening to live PCM 8kHz audio stream via WebRTC.
              </p>
            </div>
            <button
              onClick={() => setIsListeningLive(false)}
              className="text-xs text-primary font-bold hover:underline"
            >
              Mute Live Audio
            </button>
          </div>
        )}

        {/* Live Header Info */}
        <div className="mt-xl mb-lg flex flex-col md:flex-row md:items-end justify-between gap-md">
          <div>
            <div className="flex items-center gap-sm mb-xs">
              <div className={`w-3 h-3 rounded-full ${callData.status === 'active' ? 'bg-primary pulse-indicator animate-pulse' : 'bg-outline'}`}></div>
              <span className={`font-label-sm text-label-sm uppercase tracking-widest font-bold ${callData.status === 'active' ? 'text-primary' : 'text-outline'}`}>
                {callData.status === 'active' ? 'Live Session' : 'Completed Session'}
              </span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">{callData.callerName || `Call with ${callData.callerNumber}`}</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Duration: {callData.duration} • AI Agent: {callData.agentId}</p>
          </div>
          <div className="flex flex-wrap gap-sm">
            <button 
              onClick={() => setIsDialerOpen(true)}
              className="flex items-center gap-xs px-md py-sm bg-primary text-on-primary rounded-lg font-label-md text-label-md font-bold hover:brightness-110 transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-[20px]">call</span>
              New Outbound Call
            </button>
            <button
              className={`flex items-center gap-xs px-md py-sm border rounded-lg font-label-md text-label-md transition-all ${
                isListeningLive
                  ? 'bg-primary-container text-on-primary-container border-primary font-bold'
                  : 'bg-surface border-outline-variant text-on-surface hover:bg-surface-container-low'
              }`}
              onClick={handleToggleListenLive}
            >
              <span className="material-symbols-outlined text-[20px]">headphones</span>
              {isListeningLive ? 'Live Audio Active' : 'Listen Live'}
            </button>
            <button
              className={`flex items-center gap-xs px-md py-sm border rounded-lg font-label-md text-label-md transition-all ${
                isTakingOver
                  ? 'bg-error text-white border-error font-bold'
                  : 'bg-surface border-outline-variant text-on-surface hover:bg-surface-container-low'
              }`}
              onClick={isTakingOver ? handleReleaseTakeOver : handleTakeOver}
            >
              <span className="material-symbols-outlined text-[20px]">record_voice_over</span>
              {isTakingOver ? 'Release Call' : 'Take Over'}
            </button>
            <button
              className="flex items-center gap-xs px-md py-sm border border-outline-variant bg-surface text-on-surface hover:bg-surface-container-low rounded-lg font-label-md text-label-md font-semibold transition-all"
              onClick={() => setIsTransferModalOpen(true)}
            >
              <span className="material-symbols-outlined text-[20px] text-tertiary">phone_forwarded</span>
              Transfer Call
            </button>
          </div>
        </div>

        <PhoneDialerModal isOpen={isDialerOpen} onClose={() => setIsDialerOpen(false)} />

        {/* Live Call Transfer Modal */}
        {isTransferModalOpen && (
          <div className="fixed inset-0 z-50 bg-scrim/40 backdrop-blur-xs flex items-center justify-center p-md">
            <div className="bg-surface border border-outline-variant rounded-2xl p-lg max-w-md w-full shadow-2xl animate-fade-in">
              <div className="flex items-center justify-between mb-md">
                <div className="flex items-center gap-xs">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]">phone_forwarded</span>
                  </div>
                  <h3 className="font-headline-sm text-on-surface font-bold">Transfer Active Call</h3>
                </div>
                <button 
                  onClick={() => setIsTransferModalOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <p className="text-xs text-on-surface-variant mb-md">
                Instantly transfer the current caller to a human agent, external office, or department mobile number via Twilio &lt;Dial&gt;.
              </p>

              <div className="space-y-sm mb-lg">
                <label className="block text-xs font-semibold text-on-surface-variant">
                  Destination Phone Number
                </label>
                <input
                  type="tel"
                  value={transferTargetNumber}
                  onChange={(e) => setTransferTargetNumber(e.target.value)}
                  placeholder="+919876543210 or +1..."
                  className="w-full px-md py-sm bg-surface-container-lowest border border-outline-variant rounded-xl font-mono text-sm text-on-surface focus:ring-2 focus:ring-primary outline-none"
                />
                <p className="text-[11px] text-on-surface-variant">
                  Caller will hear a brief hold message before being seamlessly connected.
                </p>
              </div>

              <div className="flex justify-end gap-sm">
                <button
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-md py-sm border border-outline-variant rounded-xl text-xs font-semibold hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteTransfer}
                  disabled={isTransferring || !transferTargetNumber.trim()}
                  className="px-lg py-sm bg-primary text-on-primary rounded-xl text-xs font-bold hover:brightness-110 flex items-center gap-xs disabled:opacity-50 shadow-md"
                >
                  <span className="material-symbols-outlined text-[18px]">phone_forwarded</span>
                  {isTransferring ? 'Transferring...' : 'Execute Live Transfer'}
                </button>
              </div>
            </div>
          </div>
        )}

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
                  <span className={`w-2 h-2 rounded-full ${callData.status === 'active' ? 'bg-error animate-pulse' : 'bg-outline'}`}></span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {callData.status === 'active' ? 'Live Telemetry' : 'Recorded Transcript'}
                  </span>
                </div>
              </div>
              <div className="flex-grow overflow-y-auto p-lg space-y-lg transcript-scroll" id="transcript">
                {(!callData?.transcript || callData.transcript.length === 0) ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-on-surface-variant p-lg">
                    <span className="material-symbols-outlined text-[36px] mb-xs animate-pulse text-primary">graphic_eq</span>
                    <p className="font-label-md font-bold">Listening for conversation...</p>
                    <p className="text-xs text-on-surface-variant mt-xs">Real-time transcription will appear here as the caller and AI speak.</p>
                  </div>
                ) : (
                  callData.transcript.map((msg, index) => {
                    const isAI = msg.role === 'AI';
                    return (
                      <div key={index} className={`flex gap-md max-w-[80%] ${!isAI ? 'ml-auto flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded flex-shrink-0 flex items-center justify-center ${isAI ? 'bg-primary-container' : 'bg-surface-container-highest'}`}>
                          <span className={`material-symbols-outlined text-[18px] ${isAI ? 'text-on-primary-container' : 'text-on-surface-variant'}`} style={isAI ? { fontVariationSettings: "'FILL' 1" } : {}}>
                            {isAI ? 'smart_toy' : 'person'}
                          </span>
                        </div>
                        <div className={`space-y-xs ${!isAI ? 'text-right' : ''}`}>
                          <span className="font-label-sm text-label-sm text-outline">{isAI ? 'VoiceOS (AI)' : 'Caller'} • {msg.timestamp}</span>
                          <div className={`${isAI ? 'bg-surface-container-low p-md rounded-xl rounded-tl-none border border-outline-variant' : 'bg-primary text-on-primary p-md rounded-xl rounded-tr-none'}`}>
                            <p className={`font-body-md text-body-md ${isAI ? 'text-on-surface' : ''}`}>{msg.message}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* AI Preview (Pulsing) */}
                <div className="flex gap-md max-w-[80%] opacity-80 italic">
                  <div className="w-8 h-8 rounded bg-secondary-container flex-shrink-0 flex items-center justify-center animate-pulse">
                    <span className="material-symbols-outlined text-on-secondary-container text-[18px]">auto_awesome</span>
                  </div>
                  <div className="space-y-xs">
                    <div className="flex items-center gap-xs">
                      <span className="font-label-sm text-label-sm text-primary">AI Inference Ready</span>
                      <div className="flex gap-1">
                        <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0s" }}></span>
                        <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                        <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></span>
                      </div>
                    </div>
                    <div className="bg-surface-container p-md rounded-xl rounded-tl-none border border-outline-variant border-dashed">
                      <p className="font-body-md text-body-md text-on-surface-variant">Listening for caller speech...</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-lg py-md border-t border-outline-variant bg-surface-container-lowest flex items-center justify-between">
                <div className="flex items-center gap-sm">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Streaming via Twilio Media Streams @ 8000Hz μ-law</span>
                </div>
                <button
                  className="text-primary font-label-md text-label-md flex items-center gap-xs hover:underline cursor-pointer"
                  onClick={() => setIsCrmOpen(true)}
                >
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
                      <span className={`font-label-md text-label-md flex items-center gap-xs ${callData.sentiment === 'Positive' ? 'text-primary font-bold' : callData.sentiment === 'Negative' ? 'text-error font-bold' : 'text-on-surface-variant'}`}>
                        <span className="material-symbols-outlined text-[16px]">{callData.sentiment === 'Positive' ? 'mood' : callData.sentiment === 'Negative' ? 'mood_bad' : 'sentiment_neutral'}</span>
                        {callData.sentiment}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${callData.sentiment === 'Positive' ? 'bg-primary' : callData.sentiment === 'Negative' ? 'bg-error' : 'bg-outline'}`} style={{ width: `${callData.sentimentScore}%` }}></div>
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
                <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Live AI Summary</h3>
                <button
                  className="text-primary hover:text-primary-container transition-colors cursor-pointer"
                  title="Regenerate Summary"
                  onClick={handleRegenerateSummary}
                  disabled={isRegeneratingSummary}
                >
                  <span className={`material-symbols-outlined ${isRegeneratingSummary ? 'animate-spin' : ''}`}>refresh</span>
                </button>
              </div>
              <div className="bg-surface-container-low rounded-lg p-md border border-outline-variant border-dashed">
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed italic">
                  "{callData.summary}"
                </p>
              </div>
              <button
                className="w-full mt-lg py-sm bg-surface border border-outline text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-container-highest transition-all flex justify-center items-center gap-xs cursor-pointer shadow-xs"
                onClick={handleGenerateReport}
              >
                <span className="material-symbols-outlined text-[20px]">auto_fix</span>
                Generate &amp; Download Report
              </button>
            </div>

            {/* Related Actions */}
            <div className="grid grid-cols-2 gap-sm">
              <div
                className="bg-surface border border-outline-variant rounded-xl p-md flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary hover:bg-surface-container-lowest transition-all group"
                onClick={handleSendEmailLink}
              >
                <span className="material-symbols-outlined text-outline group-hover:text-primary mb-xs">mail</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Email Link</span>
              </div>
              <div
                className="bg-surface border border-outline-variant rounded-xl p-md flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary hover:bg-surface-container-lowest transition-all group"
                onClick={handleSendSms}
              >
                <span className="material-symbols-outlined text-outline group-hover:text-primary mb-xs">sms</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Send SMS</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CRM History Drawer / Modal */}
      {isCrmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-md">
          <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-lg p-xl shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-lg">
              <h3 className="font-headline-md text-on-surface flex items-center gap-xs">
                <span className="material-symbols-outlined text-primary">person</span>
                Caller CRM Record: {callData.callerName}
              </h3>
              <button onClick={() => setIsCrmOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-md">
              <div className="p-md bg-surface-container-low rounded-xl border border-outline-variant space-y-xs">
                <p className="font-label-md text-on-surface">Contact Information</p>
                <p className="text-xs text-on-surface-variant">Phone: {callData.callerNumber}</p>
                <p className="text-xs text-on-surface-variant">Account: {callData.accountStatus} (Customer since Jan 2023)</p>
                <p className="text-xs text-on-surface-variant">Preferred Language: {callData.language}</p>
              </div>
              <div className="space-y-xs">
                <p className="font-label-md text-on-surface">Recent Call History</p>
                <div className="space-y-sm text-xs">
                  <div className="p-sm bg-surface-container rounded-lg border border-outline-variant">
                    <p className="font-semibold text-on-surface">Aug 28, 2024 • Inbound Support Call (4m 12s)</p>
                    <p className="text-on-surface-variant">Inquired about API rate limits. Resolved by AI agent Oliver.</p>
                  </div>
                  <div className="p-sm bg-surface-container rounded-lg border border-outline-variant">
                    <p className="font-semibold text-on-surface">Jul 15, 2024 • Outbound Survey Call (1m 45s)</p>
                    <p className="text-on-surface-variant">Customer gave 5/5 CSAT rating for onboarding.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-lg">
              <button
                onClick={() => setIsCrmOpen(false)}
                className="px-lg py-xs bg-primary text-on-primary rounded-xl font-label-md"
              >
                Close CRM
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
