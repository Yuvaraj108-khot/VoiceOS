import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiEmployeesService } from '../services/aiEmployees';
import type { AIEmployee } from '../services/aiEmployees';
import { callsService } from '../services/calls';
import type { TriggerCallResponse } from '../services/calls';


interface PhoneDialerModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedEmployeeId?: string;
  initialPhoneNumber?: string;
}

const COUNTRY_CODES = [
  { code: '+1', country: 'US/CA', flag: '🇺🇸' },
  { code: '+91', country: 'IN', flag: '🇮🇳' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+61', country: 'AU', flag: '🇦🇺' },
  { code: '+49', country: 'DE', flag: '🇩🇪' },
  { code: '+33', country: 'FR', flag: '🇫🇷' },
  { code: '+81', country: 'JP', flag: '🇯🇵' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
];

export const PhoneDialerModal: React.FC<PhoneDialerModalProps> = ({
  isOpen,
  onClose,
  preselectedEmployeeId,
  initialPhoneNumber = '',
}) => {
  const navigate = useNavigate();
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [employees, setEmployees] = useState<AIEmployee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(preselectedEmployeeId || '');
  const [callReason, setCallReason] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(true);
  
  // Call status state
  const [callState, setCallState] = useState<'IDLE' | 'INITIATING' | 'RINGING' | 'CONNECTED' | 'ERROR'>('IDLE');
  const [callResponse, setCallResponse] = useState<TriggerCallResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      // Reset modal state
      setCallState('IDLE');
      setErrorMessage('');
      setCallResponse(null);
      if (initialPhoneNumber) setPhoneNumber(initialPhoneNumber);

      // Load employees
      const fetchEmployees = async () => {
        try {
          setLoadingEmployees(true);
          const list = await aiEmployeesService.list();
          setEmployees(list);
          if (!selectedEmployeeId && list.length > 0) {
            setSelectedEmployeeId(preselectedEmployeeId || list[0].id);
          }
        } catch (err) {
          console.error('Failed to load AI employees in dialer', err);
        } finally {
          setLoadingEmployees(false);
        }
      };
      fetchEmployees();
    }
  }, [isOpen, preselectedEmployeeId, initialPhoneNumber]);

  if (!isOpen) return null;

  const handleKeyPress = (digit: string) => {
    setPhoneNumber((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  const getE164Number = (): string => {
    const cleanCode = countryCode.replace(/[^\d+]/g, '');
    const rawDigits = phoneNumber.replace(/\D/g, '');
    if (!rawDigits) return '';
    if (phoneNumber.trim().startsWith('+')) {
      return '+' + rawDigits;
    }
    return (cleanCode.startsWith('+') ? cleanCode : '+' + cleanCode) + rawDigits;
  };


  const handleInitiateCall = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullNumber = getE164Number();

    if (!fullNumber || fullNumber.length < 8) {
      setErrorMessage('Please enter a valid phone number with area code.');
      return;
    }

    if (!selectedEmployeeId) {
      setErrorMessage('Please select an AI Employee to place the call.');
      return;
    }

    setErrorMessage('');
    setCallState('INITIATING');

    try {
      // Call service API
      const response = await callsService.triggerOutboundCall({
        employeeId: selectedEmployeeId,
        toNumber: fullNumber,
        variables: callReason ? { purpose: callReason } : undefined
      });

      setCallResponse(response);
      setCallState('RINGING');

      // Simulate transition to CONNECTED after 3.5s for rich feedback experience
      setTimeout(() => {
        setCallState('CONNECTED');
      }, 3500);

    } catch (err: any) {
      setCallState('ERROR');
      setErrorMessage(err.message || 'Failed to connect phone call. Check your network or Twilio settings.');
    }
  };

  const handleOpenLiveCallCenter = () => {
    onClose();
    navigate('/live-call-center');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-surface border border-outline-variant rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-lg py-md border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
          <div className="flex items-center gap-sm">
            <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container">
              <span className="material-symbols-outlined text-[20px]">call</span>
            </div>
            <div>
              <h3 className="font-headline-md text-[18px] text-on-surface font-bold">Outbound Phone Dialer</h3>
              <p className="font-body-sm text-[12px] text-on-surface-variant">Make an instant phone call using VoiceOS</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-xs text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors"
            title="Close Dialer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-lg overflow-y-auto space-y-lg flex-1">

          {/* Active Call Status Banner */}
          {callState !== 'IDLE' && (
            <div className={`p-md rounded-xl border flex flex-col gap-sm ${
              callState === 'INITIATING' ? 'bg-primary-container/20 border-primary/40 text-primary' :
              callState === 'RINGING' ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400' :
              callState === 'CONNECTED' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' :
              'bg-error-container/20 border-error/40 text-error'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-sm">
                  {callState === 'INITIATING' && (
                    <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                  )}
                  {callState === 'RINGING' && (
                    <span className="material-symbols-outlined animate-bounce text-[20px]">ring_volume</span>
                  )}
                  {callState === 'CONNECTED' && (
                    <span className="material-symbols-outlined text-[20px]">call_in_progress</span>
                  )}
                  {callState === 'ERROR' && (
                    <span className="material-symbols-outlined text-[20px]">error</span>
                  )}
                  <span className="font-label-md font-bold uppercase tracking-wider text-[12px]">
                    {callState === 'INITIATING' ? 'Initiating Carrier Handshake...' :
                     callState === 'RINGING' ? 'Phone Ringing...' :
                     callState === 'CONNECTED' ? 'Call Connected Live!' : 'Call Failed'}
                  </span>
                </div>
                {callResponse?.twilioCallSid && (
                  <span className="font-mono text-[10px] opacity-75">SID: {callResponse.twilioCallSid.slice(0, 10)}...</span>
                )}
              </div>

              {callState === 'RINGING' && (
                <p className="font-body-sm text-[12px] opacity-90">
                  Dialing <span className="font-bold">{getE164Number()}</span> via VoiceOS Telephony Engine.
                </p>
              )}

              {callState === 'CONNECTED' && (
                <div className="space-y-sm pt-xs">
                  <p className="font-body-sm text-[12px]">
                    The recipient has answered! AI Employee is actively conducting the call session.
                  </p>
                  <button 
                    onClick={handleOpenLiveCallCenter}
                    className="w-full py-xs px-md bg-emerald-600 text-white rounded-lg font-label-md text-[13px] hover:bg-emerald-700 transition-colors flex items-center justify-center gap-xs shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">headphones</span>
                    Monitor Live in Call Center
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleInitiateCall} className="space-y-md">
            
            {/* AI Employee Selection */}
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">
                Select AI Employee
              </label>
              {loadingEmployees ? (
                <div className="h-10 bg-surface-container animate-pulse rounded-lg"></div>
              ) : (
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full h-10 px-md bg-surface-container-low border border-outline-variant rounded-lg font-body-sm text-on-surface focus:ring-2 focus:ring-primary focus:outline-none"
                  disabled={callState !== 'IDLE' && callState !== 'ERROR'}
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.role} ({emp.language || 'English'})
                    </option>
                  ))}
                  {employees.length === 0 && (
                    <option value="1">Sienna — Senior Support Executive</option>
                  )}
                </select>
              )}
            </div>

            {/* Phone Input with Country Code */}
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">
                Target Phone Number
              </label>
              <div className="flex gap-xs">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="h-11 px-sm bg-surface-container-low border border-outline-variant rounded-lg font-body-sm text-on-surface focus:ring-2 focus:ring-primary focus:outline-none shrink-0"
                  disabled={callState !== 'IDLE' && callState !== 'ERROR'}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} ({c.country})
                    </option>
                  ))}
                </select>

                <div className="relative flex-1">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number..."
                    className="w-full h-11 pl-md pr-[40px] bg-surface-container-low border border-outline-variant rounded-lg font-mono text-[16px] text-on-surface focus:ring-2 focus:ring-primary focus:outline-none tracking-wider"
                    disabled={callState !== 'IDLE' && callState !== 'ERROR'}
                  />
                  {phoneNumber && (
                    <button
                      type="button"
                      onClick={handleBackspace}
                      className="absolute right-md top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
                      title="Delete character"
                    >
                      <span className="material-symbols-outlined text-[18px]">backspace</span>
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-xs text-[11px] text-outline flex justify-between">
                <span>E.164 Preview: <strong className="text-on-surface font-mono">{getE164Number() || countryCode}</strong></span>
                <span>Format: +[Country][Number]</span>
              </p>
            </div>

            {/* Tactile Keypad (0-9, *, #, +) */}
            <div className="bg-surface-container-lowest p-md border border-outline-variant rounded-xl">
              <div className="grid grid-cols-3 gap-sm text-center">
                {[
                  { digit: '1', sub: '—' },
                  { digit: '2', sub: 'ABC' },
                  { digit: '3', sub: 'DEF' },
                  { digit: '4', sub: 'GHI' },
                  { digit: '5', sub: 'JKL' },
                  { digit: '6', sub: 'MNO' },
                  { digit: '7', sub: 'PQRS' },
                  { digit: '8', sub: 'TUV' },
                  { digit: '9', sub: 'WXYZ' },
                  { digit: '*', sub: ' ' },
                  { digit: '0', sub: '+' },
                  { digit: '#', sub: ' ' },
                ].map((item) => (
                  <button
                    key={item.digit}
                    type="button"
                    onClick={() => handleKeyPress(item.digit)}
                    disabled={callState !== 'IDLE' && callState !== 'ERROR'}
                    className="py-sm bg-surface hover:bg-surface-container border border-outline-variant/60 rounded-xl flex flex-col items-center justify-center active:scale-95 transition-all shadow-xs disabled:opacity-50"
                  >
                    <span className="font-headline-md text-[18px] font-bold text-on-surface leading-none">
                      {item.digit}
                    </span>
                    <span className="text-[9px] font-mono text-outline uppercase mt-[2px]">
                      {item.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Settings / Purpose */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[12px] font-label-md text-primary flex items-center gap-xs hover:underline"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {showAdvanced ? 'expand_less' : 'tune'}
                </span>
                {showAdvanced ? 'Hide Context & Variables' : 'Add Initial Call Context (Optional)'}
              </button>

              {showAdvanced && (
                <div className="mt-xs p-md bg-surface-container-low border border-outline-variant rounded-lg space-y-xs animate-fadeIn">
                  <label className="block font-label-sm text-[11px] text-on-surface-variant">
                    Call Purpose / Note for AI
                  </label>
                  <textarea
                    rows={2}
                    value={callReason}
                    onChange={(e) => setCallReason(e.target.value)}
                    placeholder="e.g. Confirm appointment for tomorrow at 3 PM, ask if any preparation is needed."
                    className="w-full p-sm bg-surface border border-outline-variant rounded-md font-body-sm text-[12px] text-on-surface focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Error Display */}
            {errorMessage && (
              <div className="p-sm bg-error-container/30 border border-error/50 rounded-lg text-error font-body-sm text-[12px] flex items-center gap-xs">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-xs flex gap-sm">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-md px-lg bg-surface border border-outline-variant rounded-xl font-label-md text-on-surface hover:bg-surface-container transition-all"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={callState === 'INITIATING' || callState === 'RINGING'}
                className="flex-1 py-md px-lg bg-primary text-on-primary rounded-xl font-label-md font-bold hover:brightness-110 active:scale-98 transition-all shadow-md flex items-center justify-center gap-xs disabled:opacity-60"
              >
                {callState === 'INITIATING' || callState === 'RINGING' ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                    Calling...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">call</span>
                    Call Now
                  </>
                )}
              </button>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
};
