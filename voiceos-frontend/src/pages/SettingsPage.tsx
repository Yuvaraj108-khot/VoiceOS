import React, { useEffect, useState } from 'react';
import { settingsService, UnifiedSettings } from '../services/settings';

export default function SettingsPage() {
  const [settings, setSettings] = useState<UnifiedSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await settingsService.getUnifiedSettings();
        setSettings(data);
      } catch (error) {
        console.error("Failed to fetch settings", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  if (loading) {
    return <div className="pt-xxxl text-center text-on-surface-variant">Loading Settings...</div>;
  }

  if (!settings) {
    return <div className="pt-xxxl text-center text-on-surface-variant">Failed to load settings.</div>;
  }

  return (
    <>
<div className="pt-xxxl pb-xxxl px-md md:px-xxl">
<div className="max-w-5xl mx-auto">
<div className="mb-xl">
<h2 className="font-headline-lg text-headline-lg text-on-surface">Organization Settings</h2>
<p className="font-body-md text-body-md text-on-surface-variant">Manage your enterprise environment, team access, and developer resources.</p>
</div>
{/* Settings Content */}
<div className="space-y-xl">
{/* Section: Business Profile */}
<section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg" id="business">
<div className="flex justify-between items-center mb-lg">
<h3 className="font-headline-md text-headline-md text-on-surface">Business Profile</h3>
<button className="px-md py-xs bg-primary text-on-primary rounded-xl font-label-md hover:opacity-90 transition-opacity">Save Changes</button>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
<div className="space-y-xs">
<label className="font-label-md text-on-surface-variant">Organization Name</label>
<input className="w-full h-10 px-md bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary font-body-md" type="text" defaultValue={settings.organization.name || "Acme AI Solutions"}/>
</div>
<div className="space-y-xs">
<label className="font-label-md text-on-surface-variant">Industry</label>
<select className="w-full h-10 px-md bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary font-body-md" defaultValue={settings.organization.businessSettings?.industry || "Technology & SaaS"}>
<option>Technology &amp; SaaS</option>
<option>Healthcare</option>
<option>Finance</option>
</select>
</div>
<div className="md:col-span-2 space-y-xs">
<label className="font-label-md text-on-surface-variant">Support Email</label>
<input className="w-full h-10 px-md bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary font-body-md" type="email" defaultValue={settings.organization.businessSettings?.supportEmail || "ops@acme-ai.io"}/>
</div>
</div>
</section>
{/* Section: Team Permissions */}
<section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden" id="team">
<div className="p-lg border-b border-outline-variant flex justify-between items-center">
<h3 className="font-headline-md text-headline-md text-on-surface">Team Permissions</h3>
<button className="flex items-center gap-xs px-md py-xs border border-outline-variant text-on-surface rounded-xl font-label-md hover:bg-surface-container-low transition-colors">
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
<tr className="hover:bg-surface-container-lowest/50 transition-colors">
<td className="px-lg py-md flex items-center gap-md">
<div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">SH</div>
<div>
<p className="font-label-md">Sarah Hudson</p>
<p className="text-[12px] text-on-surface-variant">sarah@acme-ai.io</p>
</div>
</td>
<td className="px-lg py-md">
<span className="px-sm py-xs bg-tertiary-container/10 text-tertiary-container rounded font-label-sm uppercase tracking-wider text-[10px]">Administrator</span>
</td>
<td className="px-lg py-md text-on-surface-variant">2 mins ago</td>
<td className="px-lg py-md text-right">
<button className="text-on-surface-variant hover:text-primary transition-colors">
<span className="material-symbols-outlined">more_vert</span>
</button>
</td>
</tr>
<tr className="hover:bg-surface-container-lowest/50 transition-colors">
<td className="px-lg py-md flex items-center gap-md">
<div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">MK</div>
<div>
<p className="font-label-md">Marcus King</p>
<p className="text-[12px] text-on-surface-variant">marcus@acme-ai.io</p>
</div>
</td>
<td className="px-lg py-md">
<span className="px-sm py-xs bg-secondary-container/10 text-on-secondary-container rounded font-label-sm uppercase tracking-wider text-[10px]">Developer</span>
</td>
<td className="px-lg py-md text-on-surface-variant">14 hours ago</td>
<td className="px-lg py-md text-right">
<button className="text-on-surface-variant hover:text-primary transition-colors">
<span className="material-symbols-outlined">more_vert</span>
</button>
</td>
</tr>
</tbody>
</table>
</div>
</section>
{/* Section: API Keys */}
<section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg" id="api">
<div className="mb-lg">
<h3 className="font-headline-md text-headline-md text-on-surface">API Keys &amp; Endpoints</h3>
<div className="mt-sm flex gap-md">
<div className="flex items-center gap-xs px-sm py-xs bg-primary-container/10 text-primary rounded-lg font-label-sm">
<span className="material-symbols-outlined text-[16px]">sync_alt</span>
                                Webhooks: 4 active endpoints
                            </div>
<div className="flex items-center gap-xs px-sm py-xs bg-outline-variant/20 text-on-surface-variant rounded-lg font-label-sm">
<span className="material-symbols-outlined text-[16px]">key</span>
                                Production Tier
                            </div>
</div>
</div>
<div className="space-y-md">
<div className="p-md bg-surface-container-low border border-outline-variant rounded-lg flex items-center justify-between">
<div className="flex-1">
<p className="font-label-md text-on-surface">Live Production Key</p>
<p className="font-body-sm text-on-surface-variant font-mono">api_key_live_••••••••••••••••••••4d2a</p>
</div>
<div className="flex gap-sm">
<button className="p-xs hover:bg-outline-variant/30 rounded transition-colors" title="Copy Key">
<span className="material-symbols-outlined text-on-surface-variant">content_copy</span>
</button>
<button className="p-xs hover:bg-outline-variant/30 rounded transition-colors" title="Reveal Key">
<span className="material-symbols-outlined text-on-surface-variant">visibility</span>
</button>
</div>
</div>
<div className="p-md bg-surface-container-low border border-outline-variant rounded-lg flex items-center justify-between">
<div className="flex-1">
<p className="font-label-md text-on-surface">Sandbox Test Key</p>
<p className="font-body-sm text-on-surface-variant font-mono">api_key_test_••••••••••••••••••••9x77</p>
</div>
<div className="flex gap-sm">
<button className="p-xs hover:bg-outline-variant/30 rounded transition-colors" title="Copy Key">
<span className="material-symbols-outlined text-on-surface-variant">content_copy</span>
</button>
<button className="p-xs hover:bg-outline-variant/30 rounded transition-colors" title="Reveal Key">
<span className="material-symbols-outlined text-on-surface-variant">visibility</span>
</button>
</div>
</div>
<button className="w-full py-sm border-2 border-dashed border-outline-variant text-on-surface-variant rounded-lg font-label-md hover:bg-surface-container-low hover:border-outline transition-all">
                            + Generate New Secret Key
                        </button>
</div>
</section>
{/* Section: Billing */}
<section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg overflow-hidden relative" id="billing">
{/* Subtle pattern for premium feel */}
<div className="absolute top-0 right-0 p-lg opacity-10">
<span className="material-symbols-outlined text-[120px]" style={{"fontVariationSettings":"'FILL' 1"}}>verified</span>
</div>
<div className="relative z-10">
<h3 className="font-headline-md text-headline-md text-on-surface mb-lg">Billing &amp; Usage</h3>
<div className="flex flex-wrap gap-lg mb-xl">
<div className="flex-1 min-w-[200px] p-lg bg-primary text-on-primary rounded-xl">
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
<p className="font-label-md">$2,450.00</p>
<button className="text-primary font-label-sm hover:underline">Download</button>
</div>
</div>
</div>
</div>
</section>
{/* Section: Audit Logs */}
<section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg" id="audit">
<div className="flex justify-between items-center mb-lg">
<h3 className="font-headline-md text-headline-md text-on-surface">Audit Logs</h3>
<div className="flex gap-sm">
<button className="px-md py-xs bg-surface-container-low text-on-surface border border-outline-variant rounded-lg font-label-sm">Filter</button>
<button className="px-md py-xs bg-surface-container-low text-on-surface border border-outline-variant rounded-lg font-label-sm">Export CSV</button>
</div>
</div>
<div className="space-y-md">
<div className="flex gap-md py-sm items-start">
<div className="mt-1 w-2 h-2 rounded-full bg-primary shrink-0"></div>
<div className="flex-1">
<p className="font-body-md"><span className="font-label-md">sarah@acme-ai.io</span> rotated the production API Key</p>
<p className="text-[12px] text-on-surface-variant">Today at 14:22 • IP: 192.168.1.44</p>
</div>
</div>
<div className="flex gap-md py-sm items-start">
<div className="mt-1 w-2 h-2 rounded-full bg-outline-variant shrink-0"></div>
<div className="flex-1">
<p className="font-body-md"><span className="font-label-md">System</span> successfully processed monthly recurring billing</p>
<p className="text-[12px] text-on-surface-variant">Yesterday at 00:01 • Automated Task</p>
</div>
</div>
<div className="flex gap-md py-sm items-start">
<div className="mt-1 w-2 h-2 rounded-full bg-outline-variant shrink-0"></div>
<div className="flex-1">
<p className="font-body-md"><span className="font-label-md">marcus@acme-ai.io</span> updated the Voice Model weighting (ID: 0x9f2)</p>
<p className="text-[12px] text-on-surface-variant">Sep 10, 2024 at 09:15 • IP: 104.22.1.201</p>
</div>
</div>
<div className="pt-md text-center">
<button className="text-primary font-label-md hover:underline">View All Organization Activity</button>
</div>
</div>
</section>
</div>
</div>
</div>
    </>
  );
}



