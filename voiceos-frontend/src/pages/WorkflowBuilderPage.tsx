import { useState, useEffect } from 'react';
import { workflowsService } from '../services/workflows';
import type { Workflow } from '../services/workflows';

export default function WorkflowBuilderPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [activeWorkflow, setActiveWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const data = await workflowsService.list();
        if (data.length > 0) {
          setWorkflows(data);
          setActiveWorkflow(data[0]);
        }
      } catch (error) {
        console.error("Failed to load workflows", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkflows();
  }, []);

  if (loading) {
    return <div className="pt-xxxl text-center text-on-surface-variant">Loading Workflows...</div>;
  }

  if (!activeWorkflow) {
    return (
      <div className="pt-xxxl text-center text-on-surface-variant flex flex-col items-center gap-lg">
        <span className="material-symbols-outlined text-[64px] text-outline">account_tree</span>
        <p className="font-headline-md">No workflows found.</p>
        <button className="bg-primary text-on-primary px-xl py-md rounded-xl font-label-md" onClick={() => alert('Workflow creation coming soon!')}>Create First Workflow</button>
      </div>
    );
  }

  return (
    <>
<div className="pt-xxxl px-md max-w-lg mx-auto">
{/* Workflow Switcher */}
{workflows.length > 1 && (
  <div className="mb-lg flex gap-sm overflow-x-auto pb-xs">
    {workflows.map(wf => (
      <button
        key={wf.id}
        onClick={() => setActiveWorkflow(wf)}
        className={`px-md py-xs rounded-full font-label-sm whitespace-nowrap transition-all ${activeWorkflow.id === wf.id ? 'bg-primary text-on-primary' : 'border border-outline-variant text-on-surface-variant hover:border-primary'}`}
      >
        {wf.name}
        <span className={`ml-xs text-[10px] uppercase ${wf.status === 'active' ? 'text-green-400' : 'text-outline'}`}>• {wf.status}</span>
      </button>
    ))}
  </div>
)}
{/* Workflow Info */}
<section className="mb-xl bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm">
<div className="flex justify-between items-start mb-sm">
<div>
<span className="font-label-sm text-label-sm text-primary uppercase tracking-widest">Active Workflow</span>
<h2 className="font-headline-md text-headline-md-mobile text-on-surface">{activeWorkflow.name}</h2>
</div>
<button onClick={() => alert('Workflow settings coming soon!')} className="material-symbols-outlined text-on-surface-variant hover:bg-surface-container-low p-xs rounded-lg transition-colors">more_vert</button>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant">{activeWorkflow.description}</p>
</section>
{/* Vertical Node Flow */}
<div className="relative flex flex-col items-center gap-xl pb-xxl">

{activeWorkflow.nodes.map((node: any, index: number) => {
  const isTrigger = node.type === 'trigger';
  const isCondition = node.type === 'condition';
  const isIntegration = node.type === 'integration';
  
  let icon = 'smart_toy';
  let colorClass = 'bg-surface-container-lowest border-outline-variant';
  let iconBgClass = 'bg-tertiary text-on-tertiary';
  let labelColor = 'text-tertiary';

  if (isTrigger) {
    icon = 'call';
    colorClass = 'bg-surface-container-lowest border-2 border-primary';
    iconBgClass = 'bg-primary text-on-primary';
    labelColor = 'text-primary';
  } else if (isCondition) {
    icon = 'translate';
    iconBgClass = 'bg-secondary-container text-on-secondary-container';
    labelColor = 'text-secondary';
  } else if (isIntegration) {
    icon = 'calendar_today';
    iconBgClass = 'bg-inverse-surface text-inverse-on-surface';
    labelColor = 'text-outline';
  }

  return (
    <div key={node.id} className={`relative w-full group ${index > 0 ? 'node-connector' : ''}`}>
    <div className={`${colorClass} p-md rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-grab`}>
    <div className="flex items-center gap-md">
    <div className={`${iconBgClass} p-sm rounded-lg flex items-center justify-center`}>
    <span className="material-symbols-outlined" data-icon={icon}>{icon}</span>
    </div>
    <div className="flex-1">
    <span className={`font-label-sm text-label-sm ${labelColor}`}>{node.type.charAt(0).toUpperCase() + node.type.slice(1)}</span>
    <h3 className="font-label-md text-label-md text-on-surface">{node.title}</h3>
    </div>
    <span className="material-symbols-outlined text-outline-variant" data-icon="drag_indicator">drag_indicator</span>
    </div>
    
    {node.config?.defaultLanguage && (
      <div className="mt-md pt-md border-t border-outline-variant flex gap-sm">
      <div className="flex-1 bg-surface-container px-sm py-xs rounded text-center">
      <span className="font-label-sm text-label-sm text-on-surface-variant">Default: {node.config.defaultLanguage}</span>
      </div>
      </div>
    )}

    {node.config?.prompt && (
      <div className="mt-md text-sm text-on-surface-variant font-body-sm italic">
      "{node.config.prompt}"
      </div>
    )}

    {node.config?.integrationType && (
      <div className="mt-md flex items-center gap-sm">
      <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center overflow-hidden">
      <span className="material-symbols-outlined text-[14px] text-blue-600">sync</span>
      </div>
      <span className="font-body-sm text-body-sm text-on-surface-variant">Syncs with {node.config.integrationType}</span>
      </div>
    )}
    </div>
    </div>
  );
})}

{/* Add New Node Button */}
<button className="relative node-connector mt-sm w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg transition-transform active:scale-90 z-10" onClick={() => alert('New node added! (Connect backend to persist)')}>
<span className="material-symbols-outlined" data-icon="add">add</span>
</button>
</div>
</div>
    </>
  );
}
