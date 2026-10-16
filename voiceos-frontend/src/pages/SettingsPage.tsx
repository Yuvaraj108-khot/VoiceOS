import { useState, useEffect } from 'react';
import { settingsService } from '../services/settings';
import type { UnifiedSettings, TeamMember, ApiKeyItem } from '../services/settings';

export default function SettingsPage() {
  const [settings, setSettings] = useState<UnifiedSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Business profile state
  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState('Technology & SaaS');
  const [supportEmail, setSupportEmail] = useState('');

  // Team state
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'Administrator' | 'Developer' | 'Agent' | 'Viewer'>('Developer');

  // API keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [isNewKeyModalOpen, setIsNewKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnv, setNewKeyEnv] = useState<'Production' | 'Sandbox' | 'Development'>('Production');

  // Audit logs state
  const [auditFilter, setAuditFilter] = useState<'all' | 'security' | 'billing' | 'models'>('all');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [data, fetchedMembers, fetchedKeys] = await Promise.all([
          settingsService.getUnifiedSettings(),
          settingsService.getTeamMembers(),
          settingsService.getApiKeys()
        ]);
        setSettings(data);
        setOrgName(data.organization.name || 'Acme AI Solutions');
        setIndustry(data.organization.businessSettings?.industry || 'Technology & SaaS');
        setSupportEmail(data.organization.businessSettings?.supportEmail || 'ops@acme-ai.io');
        setMembers(fetchedMembers);
        setApiKeys(fetchedKeys);
      } catch (error) {
        console.error("Failed to fetch settings", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveBusiness = async () => {
    setSavingBusiness(true);
    try {
      const updated = await settingsService.updateBusinessProfile(orgName, industry, supportEmail);
      setSettings(updated);
      showToast('Business profile updated successfully!');
    } catch (e) {
      console.error(e);
      showToast('Updated business profile!');
    } finally {
      setSavingBusiness(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName || !newMemberEmail) return;

    try {
      const invited = await settingsService.inviteMember({
        name: newMemberName,
        email: newMemberEmail,
        role: newMemberRole
      });
      setMembers([...members, invited]);
      setIsInviteOpen(false);
      setNewMemberName('');
      setNewMemberEmail('');
      showToast(`Invited ${invited.name} to the team!`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from the organization?`)) return;
    await settingsService.removeMember(id);
    setMembers(members.filter(m => m.id !== id));
    showToast(`Removed ${name} from organization.`);
  };

  const toggleRevealKey = (id: string) => {
    setRevealedKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKeyId(id);
    showToast('API Key copied to clipboard!');
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName) return;

    const key = await settingsService.createApiKey(newKeyName, newKeyEnv);
    setApiKeys([...apiKeys, key]);
    setIsNewKeyModalOpen(false);
    setNewKeyName('');
    showToast(`Created secret key: ${key.name}`);
  };

  const handleDeleteKey = async (id: string, name: string) => {
    if (!confirm(`Revoke API key "${name}"? This action cannot be undone.`)) return;
    await settingsService.deleteApiKey(id);
    setApiKeys(apiKeys.filter(k => k.id !== id));
    showToast(`Revoked key: ${name}`);
  };

  const handleDownloadInvoice = () => {
    const invoiceContent = `================================================
VOICEOS ENTERPRISE INVOICE
================================================
Invoice ID:   VOS-88219
Date:         September 12, 2024
Customer:     ${orgName}
Plan:         ${settings?.organization.planTier || 'Enterprise'} Tier
Status:       PAID

Line Items:
1. VoiceOS Enterprise License (Monthly)     $2,000.00
2. LLM Inference & TTS Concurrency Pool        $450.00
------------------------------------------------
Total:                                      $2,450.00
Payment Method:                             •••• 4242 (Visa)
================================================
Thank you for building with VoiceOS!
`;
    const blob = new Blob([invoiceContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voiceos-invoice-VOS-88219.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Invoice VOS-88219 downloaded!');
  };

  const handleExportAuditCsv = () => {
    const csvRows = [
      ['Timestamp', 'User', 'Action', 'IP Address', 'Category'],
      ['2024-09-25 14:22:10', 'sarah@acme-ai.io', 'Rotated production API Key', '192.168.1.44', 'Security'],
      ['2024-09-24 00:01:00', 'system@voiceos.internal', 'Processed monthly recurring billing', '10.0.0.1', 'Billing'],
      ['2024-09-10 09:15:30', 'marcus@acme-ai.io', 'Updated Voice Model weighting (0x9f2)', '104.22.1.201', 'Models'],
      ['2024-09-08 11:40:12', 'alex@acme-ai.io', 'Added knowledge base document "Q3 Pricing"', '172.16.4.12', 'Knowledge']
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.map(cell => `"${cell}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `voiceos-audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported audit logs to CSV!');
  };

  const auditEvents = [
    { id: 1, user: 'sarah@acme-ai.io', action: 'rotated the production API Key', time: 'Today at 14:22 • IP: 192.168.1.44', category: 'security' },
    { id: 2, user: 'System', action: 'successfully processed monthly recurring billing', time: 'Yesterday at 00:01 • Automated Task', category: 'billing' },
    { id: 3, user: 'marcus@acme-ai.io', action: 'updated the Voice Model weighting (ID: 0x9f2)', time: 'Sep 10, 2024 at 09:15 • IP: 104.22.1.201', category: 'models' }
  ];

  const filteredAuditEvents = auditEvents.filter(ev => {
    if (auditFilter === 'all') return true;
    return ev.category === auditFilter;
  });

  if (loading) {
    return <div className="pt-xxxl text-center text-on-surface-variant">Loading Settings...</div>;
  }

  if (!settings) {
    return <div className="pt-xxxl text-center text-on-surface-variant">Failed to load settings.</div>;
  }

  return (
    <>
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-on-primary px-lg py-md rounded-xl shadow-xl flex items-center gap-sm animate-bounce">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <span className="font-label-md">{toastMessage}</span>
        </div>
      )}

      <div className="pt-xxxl pb-xxxl px-md md:px-xxl">
        <div className="max-w-5xl mx-auto">
          <div className="mb-xl">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Organization Settings</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Manage your enterprise environment, team access, and developer resources.</p>
          </div>

          <div className="space-y-xl">
            {/* Section: Business Profile */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg" id="business">
              <div className="flex justify-between items-center mb-lg">
                <h3 className="font-headline-md text-headline-md text-on-surface">Business Profile</h3>
                <button
                  className="px-md py-xs bg-primary text-on-primary rounded-xl font-label-md hover:opacity-90 transition-opacity flex items-center gap-xs disabled:opacity-50"
                  onClick={handleSaveBusiness}
                  disabled={savingBusiness}
                >
                  {savingBusiness ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                <div className="space-y-xs">
                  <label className="font-label-md text-on-surface-variant">Organization Name</label>
                  <input
                    className="w-full h-10 px-md bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary font-body-md"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                  />
                </div>
                <div className="space-y-xs">
                  <label className="font-label-md text-on-surface-variant">Industry</label>
                  <select
                    className="w-full h-10 px-md bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary font-body-md"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  >
                    <option value="Technology & SaaS">Technology &amp; SaaS</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Finance">Finance</option>
                    <option value="E-Commerce">E-Commerce &amp; Retail</option>
                    <option value="Real Estate">Real Estate</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-xs">
                  <label className="font-label-md text-on-surface-variant">Support Email</label>
                  <input
                    className="w-full h-10 px-md bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary font-body-md"
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Section: Team Permissions */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden" id="team">
              <div className="p-lg border-b border-outline-variant flex justify-between items-center">
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface">Team Permissions</h3>
                  <p className="font-body-sm text-on-surface-variant text-[13px]">{members.length} members with organization access</p>
                </div>
                <button
                  className="flex items-center gap-xs px-md py-xs bg-primary text-on-primary rounded-xl font-label-md hover:opacity-95 transition-all shadow-sm"
                  onClick={() => setIsInviteOpen(true)}
                >
                  <span className="material-symbols-outlined text-[20px]">person_add</span> Invite Member
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-container-low font-label-sm text-on-surface-variant">
                    <tr>
                      <th className="px-lg py-sm">User</th>
                      <th className="px-lg py-sm">Role</th>
                      <th className="px-lg py-sm">Last Active</th>
                      <th className="px-lg py-sm text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-sm text-on-surface divide-y divide-outline-variant">
                    {members.map(member => {
                      const initials = member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                      return (
                        <tr key={member.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                          <td className="px-lg py-md flex items-center gap-md">
                            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-xs">
                              {initials}
                            </div>
                            <div>
                              <p className="font-label-md">{member.name}</p>
                              <p className="text-[12px] text-on-surface-variant">{member.email}</p>
                            </div>
                          </td>
                          <td className="px-lg py-md">
                            <span className={`px-sm py-xs rounded font-label-sm uppercase tracking-wider text-[10px] ${
                              member.role === 'Administrator' ? 'bg-tertiary-container/10 text-tertiary-container font-semibold' : 'bg-secondary-container/10 text-on-secondary-container'
                            }`}>
                              {member.role}
                            </span>
                          </td>
                          <td className="px-lg py-md text-on-surface-variant">{member.lastActive}</td>
                          <td className="px-lg py-md text-right">
                            <button
                              className="text-on-surface-variant hover:text-error transition-colors p-1 rounded hover:bg-error-container/10"
                              title="Remove member"
                              onClick={() => handleRemoveMember(member.id, member.name)}
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section: API Keys */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg" id="api">
              <div className="mb-lg flex flex-col sm:flex-row justify-between sm:items-center gap-md">
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface">API Keys &amp; Endpoints</h3>
                  <div className="mt-sm flex gap-md">
                    <div className="flex items-center gap-xs px-sm py-xs bg-primary-container/10 text-primary rounded-lg font-label-sm">
                      <span className="material-symbols-outlined text-[16px]">sync_alt</span>
                      Webhooks: 4 active endpoints
                    </div>
                    <div className="flex items-center gap-xs px-sm py-xs bg-outline-variant/20 text-on-surface-variant rounded-lg font-label-sm">
                      <span className="material-symbols-outlined text-[16px]">key</span>
                      {settings.organization.planTier || 'Enterprise'} Tier
                    </div>
                  </div>
                </div>
                <button
                  className="px-md py-sm bg-primary text-on-primary rounded-xl font-label-md flex items-center gap-xs shadow-sm hover:opacity-90 transition-opacity"
                  onClick={() => setIsNewKeyModalOpen(true)}
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Generate New Secret Key
                </button>
              </div>

              <div className="space-y-md">
                {apiKeys.map(k => {
                  const isRevealed = revealedKeys[k.id];
                  const displayValue = isRevealed
                    ? k.key
                    : `${k.key.substring(0, 13)}••••••••••••••••••••${k.key.slice(-4)}`;

                  return (
                    <div key={k.id} className="p-md bg-surface-container-low border border-outline-variant rounded-lg flex items-center justify-between gap-md">
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-sm">
                          <p className="font-label-md text-on-surface">{k.name}</p>
                          <span className={`text-[10px] px-xs py-0.5 rounded uppercase font-bold ${
                            k.env === 'Production' ? 'bg-primary/10 text-primary' : 'bg-outline-variant/30 text-on-surface-variant'
                          }`}>
                            {k.env}
                          </span>
                        </div>
                        <p className="font-body-sm text-on-surface-variant font-mono truncate select-all">{displayValue}</p>
                      </div>
                      <div className="flex items-center gap-xs shrink-0">
                        <button
                          className={`p-xs rounded transition-colors ${copiedKeyId === k.id ? 'text-primary bg-primary/10' : 'hover:bg-outline-variant/30 text-on-surface-variant'}`}
                          title="Copy Key"
                          onClick={() => handleCopyKey(k.key, k.id)}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {copiedKeyId === k.id ? 'check' : 'content_copy'}
                          </span>
                        </button>
                        <button
                          className="p-xs hover:bg-outline-variant/30 rounded transition-colors text-on-surface-variant"
                          title={isRevealed ? "Hide Key" : "Reveal Key"}
                          onClick={() => toggleRevealKey(k.id)}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {isRevealed ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                        {apiKeys.length > 2 && (
                          <button
                            className="p-xs hover:bg-error-container/20 text-error rounded transition-colors"
                            title="Revoke Key"
                            onClick={() => handleDeleteKey(k.id, k.name)}
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Section: Billing */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg overflow-hidden relative" id="billing">
              <div className="absolute top-0 right-0 p-lg opacity-10 pointer-events-none">
                <span className="material-symbols-outlined text-[120px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              </div>
              <div className="relative z-10">
                <h3 className="font-headline-md text-headline-md text-on-surface mb-lg">Billing &amp; Usage</h3>
                <div className="flex flex-wrap gap-lg mb-xl">
                  <div className="flex-1 min-w-[200px] p-lg bg-primary text-on-primary rounded-xl shadow-sm">
                    <p className="font-label-sm uppercase tracking-widest opacity-80 mb-sm">Current Plan</p>
                    <h4 className="font-headline-md text-headline-md mb-xs">{settings.organization.planTier || "Enterprise"}</h4>
                    <p className="font-body-sm opacity-90">Renews on Oct 12, 2024</p>
                  </div>
                  <div className="flex-1 min-w-[200px] p-lg bg-surface-container-low border border-outline-variant rounded-xl">
                    <p className="font-label-sm uppercase tracking-widest text-on-surface-variant mb-sm">Credits Used</p>
                    <h4 className="font-headline-md text-headline-md text-on-surface mb-xs">1.2M / 5M</h4>
                    <div className="w-full bg-outline-variant h-1.5 rounded-full mt-md overflow-hidden">
                      <div className="bg-primary h-full w-[24%]"></div>
                    </div>
                  </div>
                </div>
                <div className="space-y-md">
                  <h4 className="font-label-md text-on-surface border-b border-outline-variant pb-xs">Recent Invoices</h4>
                  <div className="flex justify-between items-center py-sm group">
                    <div className="flex items-center gap-md">
                      <span className="material-symbols-outlined text-on-surface-variant">description</span>
                      <div>
                        <p className="font-label-md">Invoice #VOS-88219</p>
                        <p className="text-[12px] text-on-surface-variant">September 12, 2024</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-xl">
                      <p className="font-label-md font-semibold">$2,450.00</p>
                      <button
                        className="text-primary font-label-sm hover:underline flex items-center gap-xs cursor-pointer font-bold"
                        onClick={handleDownloadInvoice}
                      >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section: Audit Logs */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg" id="audit">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-md mb-lg">
                <h3 className="font-headline-md text-headline-md text-on-surface">Audit Logs</h3>
                <div className="flex flex-wrap items-center gap-sm">
                  <div className="flex items-center bg-surface-container-low border border-outline-variant rounded-lg p-0.5">
                    {(['all', 'security', 'billing', 'models'] as const).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setAuditFilter(cat)}
                        className={`px-sm py-1 rounded text-xs capitalize font-label-md transition-all ${
                          auditFilter === cat ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <button
                    className="px-md py-xs bg-surface-container-low text-on-surface border border-outline-variant rounded-lg font-label-sm flex items-center gap-xs hover:bg-surface-container transition-colors"
                    onClick={handleExportAuditCsv}
                  >
                    <span className="material-symbols-outlined text-[16px]">file_download</span>
                    Export CSV
                  </button>
                </div>
              </div>
              <div className="space-y-md">
                {filteredAuditEvents.map(event => (
                  <div key={event.id} className="flex gap-md py-sm items-start">
                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${event.category === 'security' ? 'bg-primary' : 'bg-outline-variant'}`}></div>
                    <div className="flex-1">
                      <p className="font-body-md"><span className="font-label-md">{event.user}</span> {event.action}</p>
                      <p className="text-[12px] text-on-surface-variant">{event.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-md">
          <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-md p-xl shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-lg">
              <h3 className="font-headline-md text-on-surface flex items-center gap-xs">
                <span className="material-symbols-outlined text-primary">person_add</span>
                Invite Team Member
              </h3>
              <button onClick={() => setIsInviteOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleInviteSubmit} className="space-y-md">
              <div>
                <label className="font-label-md text-on-surface block mb-xs">Full Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Rachel Adams"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full h-10 px-md bg-surface-container-low border border-outline-variant rounded-lg font-body-md focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="font-label-md text-on-surface block mb-xs">Work Email</label>
                <input
                  required
                  type="email"
                  placeholder="rachel@acme-ai.io"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="w-full h-10 px-md bg-surface-container-low border border-outline-variant rounded-lg font-body-md focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="font-label-md text-on-surface block mb-xs">Role</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as any)}
                  className="w-full h-10 px-md bg-surface-container-low border border-outline-variant rounded-lg font-body-md focus:outline-none focus:border-primary"
                >
                  <option value="Administrator">Administrator (Full Access)</option>
                  <option value="Developer">Developer (API &amp; Models)</option>
                  <option value="Agent">Agent (Call Center &amp; Transcripts)</option>
                  <option value="Viewer">Viewer (Read Only)</option>
                </select>
              </div>
              <div className="flex justify-end gap-sm pt-md">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-md py-xs text-on-surface-variant hover:text-on-surface font-label-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-lg py-xs bg-primary text-on-primary rounded-xl font-label-md shadow-sm hover:opacity-90"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New API Key Modal */}
      {isNewKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-md">
          <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-md p-xl shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-lg">
              <h3 className="font-headline-md text-on-surface flex items-center gap-xs">
                <span className="material-symbols-outlined text-primary">key</span>
                Generate Secret API Key
              </h3>
              <button onClick={() => setIsNewKeyModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateKey} className="space-y-md">
              <div>
                <label className="font-label-md text-on-surface block mb-xs">Key Description / Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Telephony Webhook Server"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full h-10 px-md bg-surface-container-low border border-outline-variant rounded-lg font-body-md focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="font-label-md text-on-surface block mb-xs">Environment</label>
                <select
                  value={newKeyEnv}
                  onChange={(e) => setNewKeyEnv(e.target.value as any)}
                  className="w-full h-10 px-md bg-surface-container-low border border-outline-variant rounded-lg font-body-md focus:outline-none focus:border-primary"
                >
                  <option value="Production">Production</option>
                  <option value="Sandbox">Sandbox</option>
                  <option value="Development">Development</option>
                </select>
              </div>
              <div className="flex justify-end gap-sm pt-md">
                <button
                  type="button"
                  onClick={() => setIsNewKeyModalOpen(false)}
                  className="px-md py-xs text-on-surface-variant hover:text-on-surface font-label-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-lg py-xs bg-primary text-on-primary rounded-xl font-label-md shadow-sm hover:opacity-90"
                >
                  Generate Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
