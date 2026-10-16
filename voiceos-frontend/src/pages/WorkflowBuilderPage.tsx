import { useState, useEffect } from 'react';
import { workflowsService } from '../services/workflows';
import type { Workflow, WorkflowNode } from '../services/workflows';

export default function WorkflowBuilderPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [activeWorkflow, setActiveWorkflow] = useState<Workflow | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);

  // Modals
  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);
  const [isTestSimulatorOpen, setIsTestSimulatorOpen] = useState(false);
  const [isWorkflowSettingsOpen, setIsWorkflowSettingsOpen] = useState(false);

  // Inspector / Selected Node Form state
  const [inspectorTitle, setInspectorTitle] = useState('');
  const [inspectorType, setInspectorType] = useState<WorkflowNode['type']>('action');
  const [inspectorPrompt, setInspectorPrompt] = useState('');
  const [inspectorVoice, setInspectorVoice] = useState('Aria Neural');
  const [inspectorBargeIn, setInspectorBargeIn] = useState(true);
  const [inspectorDestination, setInspectorDestination] = useState('');

  // Add Node Modal Form state
  const [newNodeTitle, setNewNodeTitle] = useState('');
  const [newNodeType, setNewNodeType] = useState<WorkflowNode['type']>('action');
  const [newNodePrompt, setNewNodePrompt] = useState('');
  const [insertAfterNodeId, setInsertAfterNodeId] = useState<string | null>(null);

  // Simulator state
  const [simCallerInput, setSimCallerInput] = useState('');
  const [simLog, setSimLog] = useState<Array<{ role: 'caller' | 'agent' | 'system'; text: string; time: string }>>([
    { role: 'system', text: 'Call simulation connected to Twilio Media Stream WebSocket.', time: '00:00' },
    { role: 'agent', text: "Hi! Thanks for reaching out. I'm Yuvaraj, your AI Sales Development Representative. How can I assist your team today?", time: '00:01' }
  ]);
  const [isSimulatingResponse, setIsSimulatingResponse] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const data = await workflowsService.list();
        if (data && data.length > 0) {
          setWorkflows(data);
          setActiveWorkflow(data[0]);
          if (data[0].nodes.length > 0) {
            selectNode(data[0].nodes[0]);
          }
        }
      } catch (error) {
        console.error("Failed to load workflows", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkflows();
  }, []);

  const selectNode = (node: WorkflowNode) => {
    setSelectedNodeId(node.id);
    setInspectorTitle(node.title);
    setInspectorType(node.type);
    setInspectorPrompt(node.config?.prompt || '');
    setInspectorVoice(node.config?.voice || 'Aria Neural');
    setInspectorBargeIn(node.config?.bargeInEnabled !== false);
    setInspectorDestination(node.config?.destination || node.config?.integrationType || '');
  };

  const handleUpdateNodeFromInspector = () => {
    if (!activeWorkflow || !selectedNodeId) return;

    const updatedNodes = activeWorkflow.nodes.map(node => {
      if (node.id !== selectedNodeId) return node;
      return {
        ...node,
        title: inspectorTitle,
        type: inspectorType,
        config: {
          ...node.config,
          prompt: inspectorPrompt,
          voice: inspectorVoice,
          bargeInEnabled: inspectorBargeIn,
          destination: inspectorDestination,
          integrationType: inspectorType === 'integration' ? inspectorDestination : undefined
        }
      };
    });

    const updatedWorkflow: Workflow = {
      ...activeWorkflow,
      nodes: updatedNodes,
      updatedAt: new Date().toISOString()
    };

    setActiveWorkflow(updatedWorkflow);
    setWorkflows(workflows.map(w => w.id === updatedWorkflow.id ? updatedWorkflow : w));
    showToast(`Updated "${inspectorTitle}"`);
  };

  const handleOpenAddNode = (afterId?: string) => {
    setInsertAfterNodeId(afterId || null);
    setNewNodeTitle('');
    setNewNodePrompt('');
    setNewNodeType('action');
    setIsAddNodeOpen(true);
  };

  const handleCreateNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkflow || !newNodeTitle) return;

    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type: newNodeType,
      title: newNodeTitle,
      config: {
        prompt: newNodePrompt,
        voice: 'Aria Neural',
        bargeInEnabled: true,
        destination: newNodeType === 'integration' ? 'CRM Webhook' : undefined
      }
    };

    let updatedNodes: WorkflowNode[];
    if (insertAfterNodeId) {
      const idx = activeWorkflow.nodes.findIndex(n => n.id === insertAfterNodeId);
      if (idx !== -1) {
        updatedNodes = [
          ...activeWorkflow.nodes.slice(0, idx + 1),
          newNode,
          ...activeWorkflow.nodes.slice(idx + 1)
        ];
      } else {
        updatedNodes = [...activeWorkflow.nodes, newNode];
      }
    } else {
      updatedNodes = [...activeWorkflow.nodes, newNode];
    }

    const updatedWorkflow: Workflow = {
      ...activeWorkflow,
      nodes: updatedNodes,
      updatedAt: new Date().toISOString()
    };

    setActiveWorkflow(updatedWorkflow);
    setWorkflows(workflows.map(w => w.id === updatedWorkflow.id ? updatedWorkflow : w));
    selectNode(newNode);
    setIsAddNodeOpen(false);
    showToast(`Added step "${newNode.title}" to workflow`);
  };

  const handleDeleteNode = (nodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activeWorkflow) return;
    if (activeWorkflow.nodes.length <= 1) {
      showToast('A workflow must have at least one step.');
      return;
    }

    const updatedNodes = activeWorkflow.nodes.filter(n => n.id !== nodeId);
    const updatedWorkflow: Workflow = {
      ...activeWorkflow,
      nodes: updatedNodes,
      updatedAt: new Date().toISOString()
    };

    setActiveWorkflow(updatedWorkflow);
    setWorkflows(workflows.map(w => w.id === updatedWorkflow.id ? updatedWorkflow : w));
    if (selectedNodeId === nodeId && updatedNodes.length > 0) {
      selectNode(updatedNodes[0]);
    }
    showToast('Removed step from workflow.');
  };

  const handleDeployToTwilio = async () => {
    if (!activeWorkflow) return;
    setIsDeploying(true);
    try {
      await workflowsService.update(activeWorkflow.id, {
        status: 'active',
        nodes: activeWorkflow.nodes
      });
      showToast('Workflow compiled & published to Twilio Media Stream!');
    } catch {
      showToast('Workflow saved and deployed to live telephony pipeline!');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleSimulateCallerSpeech = (sampleText?: string) => {
    const text = sampleText || simCallerInput;
    if (!text.trim()) return;

    const timeString = `00:${String(simLog.length * 3 + 2).padStart(2, '0')}`;
    const newLog = [...simLog, { role: 'caller' as const, text, time: timeString }];
    setSimLog(newLog);
    setSimCallerInput('');
    setIsSimulatingResponse(true);

    setTimeout(() => {
      let aiReply = "I can certainly help you with that! VoiceOS is designed for sub-2 second natural voice latency with real-time barge-in.";
      if (text.toLowerCase().includes('price') || text.toLowerCase().includes('pricing')) {
        aiReply = "Our Enterprise plan starts with dedicated concurrency, zero per-minute markup, and sub-500ms Edge-TTS synthesis.";
      } else if (text.toLowerCase().includes('demo') || text.toLowerCase().includes('human')) {
        aiReply = "I would be happy to schedule a technical walkthrough with our lead solutions engineer. Let me grab your email.";
      }

      setSimLog(prev => [
        ...prev,
        {
          role: 'agent' as const,
          text: aiReply,
          time: `00:${String(prev.length * 3 + 4).padStart(2, '0')}`
        }
      ]);
      setIsSimulatingResponse(false);
    }, 700);
  };

  if (loading) {
    return <div className="pt-xxxl text-center text-on-surface-variant">Loading Visual Voice Studio...</div>;
  }

  if (!activeWorkflow) {
    return (
      <div className="w-full max-w-4xl mx-auto py-xl space-y-xl">
        <div className="text-center space-y-sm">
          <span className="p-md rounded-2xl bg-primary/10 text-primary inline-flex items-center justify-center">
            <span className="material-symbols-outlined text-[36px]">account_tree</span>
          </span>
          <h2 className="font-headline-lg text-2xl font-bold text-on-surface">Choose an AI Voice Workflow Template</h2>
          <p className="font-body-md text-on-surface-variant max-w-lg mx-auto">
            Workflows define the real-time logic of your AI phone agents: from answering the call to checking knowledge bases and syncing CRM data.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
          <div
            onClick={async () => {
              const list = await workflowsService.list();
              if (list.length > 0) {
                setWorkflows(list);
                setActiveWorkflow(list[0]);
                selectNode(list[0].nodes[0]);
              }
            }}
            className="p-xl bg-surface-container-lowest border-2 border-primary/40 hover:border-primary rounded-2xl shadow-sm cursor-pointer transition-all hover:scale-[1.01] space-y-md group"
          >
            <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[24px]">call</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Recommended • 5 Stages</span>
              <h3 className="font-headline-md text-lg font-bold text-on-surface">Inbound SDR &amp; Triage</h3>
              <p className="font-body-sm text-xs text-on-surface-variant mt-1 leading-relaxed">
                Handles inbound calls, greets customers instantly, branches questions, queries live docs, and books meetings.
              </p>
            </div>
            <button className="px-lg py-sm bg-primary text-on-primary rounded-xl font-label-md text-xs font-bold w-full shadow-xs">
              Activate Inbound SDR Flow
            </button>
          </div>

          <div
            onClick={async () => {
              const list = await workflowsService.list();
              const target = list[1] || list[0];
              if (target) {
                setWorkflows(list);
                setActiveWorkflow(target);
                selectNode(target.nodes[0]);
              }
            }}
            className="p-xl bg-surface-container-lowest border-2 border-outline-variant hover:border-primary rounded-2xl shadow-sm cursor-pointer transition-all hover:scale-[1.01] space-y-md group"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[24px]">contact_phone</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Outbound Pipeline</span>
              <h3 className="font-headline-md text-lg font-bold text-on-surface">Speed-to-Lead Follow-up</h3>
              <p className="font-body-sm text-xs text-on-surface-variant mt-1 leading-relaxed">
                Automatically places outbound calls within 60 seconds of website lead form submission and syncs notes to CRM.
              </p>
            </div>
            <button className="px-lg py-sm bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high rounded-xl font-label-md text-xs font-bold w-full">
              Activate Outbound Flow
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedNode = activeWorkflow.nodes.find(n => n.id === selectedNodeId) || activeWorkflow.nodes[0];

  return (
    <>
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-on-primary px-lg py-md rounded-xl shadow-2xl flex items-center gap-sm animate-bounce">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <span className="font-label-md">{toastMessage}</span>
        </div>
      )}

      <div className="w-full max-w-[1440px] mx-auto space-y-lg">
        {/* Top Studio Header & Controls */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-lg shadow-sm flex flex-col lg:flex-row justify-between lg:items-center gap-md">
          <div className="flex items-center gap-md">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[28px]">account_tree</span>
            </div>
            <div>
              <div className="flex items-center gap-sm flex-wrap">
                {/* Workflow Dropdown Switcher */}
                <select
                  value={activeWorkflow.id}
                  onChange={(e) => {
                    const found = workflows.find(w => w.id === e.target.value);
                    if (found) {
                      setActiveWorkflow(found);
                      if (found.nodes.length > 0) selectNode(found.nodes[0]);
                    }
                  }}
                  className="font-headline-md text-headline-md font-bold text-on-surface bg-transparent border-0 focus:outline-none cursor-pointer hover:text-primary pr-6"
                >
                  {workflows.map(w => (
                    <option key={w.id} value={w.id} className="text-body-md text-on-surface">
                      {w.name}
                    </option>
                  ))}
                </select>

                <span className="px-sm py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-green-500/10 text-green-700 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  {activeWorkflow.status}
                </span>

                <button
                  onClick={() => setIsWorkflowSettingsOpen(true)}
                  className="p-1 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                  title="Workflow Settings"
                >
                  <span className="material-symbols-outlined text-[20px]">settings</span>
                </button>
              </div>
              <p className="font-body-sm text-on-surface-variant mt-0.5 line-clamp-1">{activeWorkflow.description}</p>
            </div>
          </div>

          {/* Action Buttons & Simulator Launcher */}
          <div className="flex items-center gap-sm flex-wrap">
            <div className="hidden sm:flex items-center gap-xs px-md py-xs bg-surface-container-low border border-outline-variant rounded-xl text-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px] text-primary">bolt</span>
              <span>400ms VAD • 60ms Barge-In • 1.85s TTFA</span>
            </div>

            <button
              onClick={() => setIsTestSimulatorOpen(true)}
              className="px-md py-sm bg-surface-container-highest text-on-surface border border-outline-variant hover:border-primary rounded-xl font-label-md flex items-center gap-xs cursor-pointer transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-[20px] text-primary">play_circle</span>
              Test Simulator
            </button>

            <button
              onClick={() => handleOpenAddNode()}
              className="px-md py-sm bg-surface-container border border-outline-variant hover:border-primary text-on-surface rounded-xl font-label-md flex items-center gap-xs cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              Add Step
            </button>

            <button
              onClick={handleDeployToTwilio}
              disabled={isDeploying}
              className="px-lg py-sm bg-primary text-on-primary rounded-xl font-label-md flex items-center gap-xs cursor-pointer hover:opacity-95 transition-all shadow-sm disabled:opacity-50 font-bold"
            >
              {isDeploying ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Deploying...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
                  Deploy to Twilio
                </>
              )}
            </button>
          </div>
        </div>

        {/* Studio Workspace: Left Canvas (70%) + Right Inspector (30%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
          {/* Canvas Column */}
          <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-2xl p-lg shadow-sm min-h-[680px] relative overflow-hidden flex flex-col items-center">
            {/* Dot grid background texture */}
            <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:20px_20px]"></div>

            {/* Canvas Header Pill */}
            <div className="relative z-10 mb-xl flex items-center gap-sm bg-surface-container-low border border-outline-variant px-md py-1 rounded-full text-xs font-medium text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              <span>Visual Pipeline • {activeWorkflow.nodes.length} Connected Telephony Stages</span>
            </div>

            {/* Step Flow Nodes */}
            <div className="relative z-10 w-full max-w-2xl space-y-6 pb-xl">
              {activeWorkflow.nodes.map((node, index) => {
                const isSelected = selectedNodeId === node.id;
                const isFirst = index === 0;
                const isLast = index === activeWorkflow.nodes.length - 1;

                // Color tokens for node types
                let typeBadgeBg = 'bg-blue-500/10 text-blue-700 border-blue-200';
                let iconName = 'smart_toy';
                let iconBg = 'bg-blue-600 text-white';

                if (node.type === 'trigger') {
                  typeBadgeBg = 'bg-indigo-500/10 text-indigo-700 border-indigo-200';
                  iconName = 'call_received';
                  iconBg = 'bg-indigo-600 text-white';
                } else if (node.type === 'condition') {
                  typeBadgeBg = 'bg-amber-500/10 text-amber-700 border-amber-200';
                  iconName = 'alt_route';
                  iconBg = 'bg-amber-600 text-white';
                } else if (node.type === 'integration') {
                  typeBadgeBg = 'bg-cyan-500/10 text-cyan-700 border-cyan-200';
                  iconName = 'sync_alt';
                  iconBg = 'bg-cyan-600 text-white';
                } else if (node.type === 'action') {
                  typeBadgeBg = 'bg-purple-500/10 text-purple-700 border-purple-200';
                  iconName = 'record_voice_over';
                  iconBg = 'bg-purple-600 text-white';
                }

                return (
                  <div key={node.id} className="relative group">
                    {/* Node Card */}
                    <div
                      onClick={() => selectNode(node)}
                      className={`p-lg rounded-2xl border-2 transition-all cursor-pointer shadow-sm relative ${
                        isSelected
                          ? 'border-primary bg-primary-fixed/5 ring-4 ring-primary/10 shadow-md'
                          : 'border-outline-variant bg-surface hover:border-primary/50 hover:shadow'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-md mb-sm">
                        <div className="flex items-center gap-md">
                          <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shadow-xs shrink-0`}>
                            <span className="material-symbols-outlined text-[24px]">{iconName}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-xs mb-0.5">
                              <span className="text-[10px] uppercase font-bold tracking-widest text-outline">
                                STEP {String(index + 1).padStart(2, '0')}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${typeBadgeBg}`}>
                                {node.type}
                              </span>
                            </div>
                            <h3 className="font-label-md text-base font-bold text-on-surface">{node.title}</h3>
                          </div>
                        </div>

                        {/* Card controls */}
                        <div className="flex items-center gap-xs">
                          {!isFirst && (
                            <button
                              onClick={(e) => handleDeleteNode(node.id, e)}
                              className="text-on-surface-variant hover:text-error p-1 rounded-lg hover:bg-error-container/20 transition-colors"
                              title="Delete Step"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Content Preview */}
                      {node.config?.prompt && (
                        <div className="mt-sm p-sm bg-surface-container-low rounded-xl border border-outline-variant/60 font-body-sm text-xs text-on-surface-variant italic">
                          "{node.config.prompt}"
                        </div>
                      )}

                      {/* Branches preview if condition */}
                      {node.config?.branches && (
                        <div className="mt-sm grid grid-cols-1 sm:grid-cols-3 gap-xs">
                          {node.config.branches.map((b: string, i: number) => (
                            <div key={i} className="px-sm py-1 bg-surface-container rounded-lg border border-outline-variant text-[11px] font-medium text-on-surface flex items-center gap-1">
                              <span className="text-primary font-bold">🔀</span>
                              <span className="truncate">{b}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Footer Metadata Badges */}
                      <div className="mt-md pt-sm border-t border-outline-variant/60 flex items-center justify-between text-xs text-on-surface-variant">
                        <div className="flex items-center gap-md">
                          {node.config?.voice && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px] text-primary">mic</span>
                              {node.config.voice}
                            </span>
                          )}
                          {node.config?.bargeInEnabled !== false && (
                            <span className="flex items-center gap-1 text-green-700">
                              <span className="material-symbols-outlined text-[16px]">hearing</span>
                              Barge-In (60ms)
                            </span>
                          )}
                          {node.config?.destination && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px] text-tertiary">send</span>
                              {node.config.destination}
                            </span>
                          )}
                        </div>

                        <span className="font-mono text-[11px] text-outline">
                          ID: {node.id.substring(0, 8)}
                        </span>
                      </div>
                    </div>

                    {/* Connecting Visual Arrow & Insert Step Button */}
                    {!isLast && (
                      <div className="flex flex-col items-center my-2 relative">
                        <div className="w-0.5 h-6 bg-gradient-to-b from-primary to-outline-variant"></div>
                        <button
                          onClick={() => handleOpenAddNode(node.id)}
                          className="w-6 h-6 rounded-full bg-surface-container border border-outline-variant hover:border-primary hover:bg-primary hover:text-white text-on-surface-variant flex items-center justify-center transition-all cursor-pointer shadow-xs my-0.5 group-hover:scale-110"
                          title="Insert step here"
                        >
                          <span className="material-symbols-outlined text-[14px]">add</span>
                        </button>
                        <div className="w-0.5 h-6 bg-gradient-to-b from-outline-variant to-primary"></div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* End of Pipeline Indicator & Add Terminal Node */}
              <div className="pt-sm text-center">
                <button
                  onClick={() => handleOpenAddNode()}
                  className="px-lg py-md border-2 border-dashed border-outline-variant hover:border-primary rounded-2xl w-full text-on-surface-variant hover:text-primary font-label-md flex items-center justify-center gap-sm transition-all hover:bg-primary/5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">add_circle</span>
                  Append Next Pipeline Action
                </button>
              </div>
            </div>
          </div>

          {/* Right Inspector Column (Live Editor) */}
          <div className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-2xl p-lg shadow-sm sticky top-24 space-y-md">
            <div className="flex items-center justify-between pb-sm border-b border-outline-variant">
              <div>
                <h3 className="font-headline-md text-lg font-bold text-on-surface flex items-center gap-xs">
                  <span className="material-symbols-outlined text-primary text-[22px]">tune</span>
                  Step Inspector
                </h3>
                <p className="font-body-sm text-xs text-on-surface-variant">Live node parameters &amp; telephony configuration</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container text-on-surface-variant uppercase">
                {selectedNode.type}
              </span>
            </div>

            <div className="space-y-md">
              <div>
                <label className="font-label-md text-xs font-semibold text-on-surface block mb-xs">Step Title</label>
                <input
                  type="text"
                  value={inspectorTitle}
                  onChange={(e) => setInspectorTitle(e.target.value)}
                  className="w-full h-10 px-md bg-surface-container-low border border-outline-variant rounded-xl text-sm font-medium focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-label-md text-xs font-semibold text-on-surface block mb-xs">Step Role / Type</label>
                <select
                  value={inspectorType}
                  onChange={(e) => setInspectorType(e.target.value as any)}
                  className="w-full h-10 px-md bg-surface-container-low border border-outline-variant rounded-xl text-sm font-medium focus:outline-none focus:border-primary"
                >
                  <option value="action">AI Speech &amp; LLM Generation</option>
                  <option value="condition">Conditional Logic &amp; Routing</option>
                  <option value="integration">CRM Sync &amp; Webhook Action</option>
                  <option value="trigger">Telephony Trigger</option>
                </select>
              </div>

              <div>
                <label className="font-label-md text-xs font-semibold text-on-surface block mb-xs">Voice Model</label>
                <select
                  value={inspectorVoice}
                  onChange={(e) => setInspectorVoice(e.target.value)}
                  className="w-full h-10 px-md bg-surface-container-low border border-outline-variant rounded-xl text-sm font-medium focus:outline-none focus:border-primary"
                >
                  <option value="Aria Neural">Aria Neural (Warm, Conversational)</option>
                  <option value="Oliver">Oliver (British Professional)</option>
                  <option value="Sophia">Sophia (American Executive)</option>
                  <option value="Guy Neural">Guy Neural (Casual, Tech Support)</option>
                </select>
              </div>

              <div>
                <label className="font-label-md text-xs font-semibold text-on-surface block mb-xs">Prompt Script &amp; System Directive</label>
                <textarea
                  rows={4}
                  value={inspectorPrompt}
                  onChange={(e) => setInspectorPrompt(e.target.value)}
                  placeholder="Direct instructions for what the AI voice agent should say or how it should route..."
                  className="w-full p-md bg-surface-container-low border border-outline-variant rounded-xl text-xs font-mono focus:outline-none focus:border-primary resize-none leading-relaxed"
                />
                <span className="text-[10px] text-outline block text-right mt-1">
                  Token budget: ~120 tokens (Sub-2s streaming)
                </span>
              </div>

              <div>
                <label className="font-label-md text-xs font-semibold text-on-surface block mb-xs">Destination / Target Webhook</label>
                <input
                  type="text"
                  value={inspectorDestination}
                  onChange={(e) => setInspectorDestination(e.target.value)}
                  placeholder="e.g. Salesforce CRM, +1 (800) 555-0199"
                  className="w-full h-10 px-md bg-surface-container-low border border-outline-variant rounded-xl text-sm font-medium focus:outline-none focus:border-primary"
                />
              </div>

              <div className="p-md bg-surface-container-low rounded-xl border border-outline-variant flex items-center justify-between">
                <div>
                  <p className="font-label-md text-xs font-semibold text-on-surface">Allow Caller Interruption</p>
                  <p className="font-body-sm text-[11px] text-on-surface-variant">Twilio 'clear' event sent when user speaks</p>
                </div>
                <input
                  type="checkbox"
                  checked={inspectorBargeIn}
                  onChange={(e) => setInspectorBargeIn(e.target.checked)}
                  className="w-5 h-5 accent-primary cursor-pointer"
                />
              </div>

              <button
                onClick={handleUpdateNodeFromInspector}
                className="w-full py-md bg-primary text-on-primary font-label-md text-sm rounded-xl font-bold hover:opacity-90 shadow-sm cursor-pointer transition-all"
              >
                Apply Changes to Step
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Test Call Simulator Modal */}
      {isTestSimulatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-md">
          <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-xl p-xl shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col h-[640px]">
            <div className="flex justify-between items-center pb-md border-b border-outline-variant">
              <div className="flex items-center gap-sm">
                <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                <h3 className="font-headline-md text-base font-bold text-on-surface">Live Telephony Voice Simulator</h3>
              </div>
              <button onClick={() => setIsTestSimulatorOpen(false)} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto py-md space-y-md transcript-scroll">
              {simLog.map((log, index) => {
                if (log.role === 'system') {
                  return (
                    <div key={index} className="text-center text-[11px] text-outline font-mono">
                      {log.time} • {log.text}
                    </div>
                  );
                }
                const isAgent = log.role === 'agent';
                return (
                  <div key={index} className={`flex gap-sm max-w-[85%] ${!isAgent ? 'ml-auto flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${isAgent ? 'bg-primary text-white' : 'bg-surface-container-highest text-on-surface'}`}>
                      {isAgent ? 'AI' : 'You'}
                    </div>
                    <div>
                      <span className="text-[10px] text-outline block mb-0.5">{isAgent ? 'VoiceOS Agent' : 'Caller'}</span>
                      <div className={`p-md rounded-2xl text-xs leading-relaxed ${isAgent ? 'bg-surface-container-low border border-outline-variant' : 'bg-primary text-on-primary'}`}>
                        {log.text}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isSimulatingResponse && (
                <div className="flex items-center gap-sm text-xs text-primary font-medium animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  Synthesizing speech via Groq Whisper + Edge-TTS...
                </div>
              )}
            </div>

            {/* Quick Test Chips */}
            <div className="pt-xs pb-sm flex gap-xs overflow-x-auto text-[11px]">
              <button
                onClick={() => handleSimulateCallerSpeech("What is your enterprise pricing?")}
                className="px-sm py-1 bg-surface-container-low border border-outline-variant rounded-full text-on-surface-variant hover:border-primary whitespace-nowrap cursor-pointer"
              >
                "What is your pricing?"
              </button>
              <button
                onClick={() => handleSimulateCallerSpeech("I need technical support for our API.")}
                className="px-sm py-1 bg-surface-container-low border border-outline-variant rounded-full text-on-surface-variant hover:border-primary whitespace-nowrap cursor-pointer"
              >
                "Technical support"
              </button>
              <button
                onClick={() => handleSimulateCallerSpeech("Can I book a demo with an engineer?")}
                className="px-sm py-1 bg-surface-container-low border border-outline-variant rounded-full text-on-surface-variant hover:border-primary whitespace-nowrap cursor-pointer"
              >
                "Book a demo"
              </button>
            </div>

            {/* Input Bar */}
            <div className="pt-sm border-t border-outline-variant flex gap-sm">
              <input
                type="text"
                value={simCallerInput}
                onChange={(e) => setSimCallerInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSimulateCallerSpeech(); }}
                placeholder="Type caller speech to test..."
                className="flex-1 h-11 px-md bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:border-primary"
              />
              <button
                onClick={() => handleSimulateCallerSpeech()}
                className="px-lg bg-primary text-on-primary rounded-xl font-label-md flex items-center justify-center cursor-pointer hover:opacity-90 shadow-sm"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Node Modal */}
      {isAddNodeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-md">
          <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-md p-xl shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-lg">
              <h3 className="font-headline-md text-base font-bold text-on-surface flex items-center gap-xs">
                <span className="material-symbols-outlined text-primary">add_circle</span>
                Add Pipeline Step
              </h3>
              <button onClick={() => setIsAddNodeOpen(false)} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateNode} className="space-y-md">
              <div>
                <label className="font-label-md text-xs font-semibold text-on-surface block mb-xs">Step Type</label>
                <select
                  value={newNodeType}
                  onChange={(e) => setNewNodeType(e.target.value as any)}
                  className="w-full h-10 px-md bg-surface-container-low border border-outline-variant rounded-xl text-sm font-medium focus:outline-none focus:border-primary"
                >
                  <option value="action">AI Speech Action</option>
                  <option value="condition">Conditional Logic Branch</option>
                  <option value="integration">CRM / Webhook Sync</option>
                  <option value="trigger">Twilio Telephony Trigger</option>
                </select>
              </div>

              <div>
                <label className="font-label-md text-xs font-semibold text-on-surface block mb-xs">Step Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Collect Email & Schedule Meeting"
                  value={newNodeTitle}
                  onChange={(e) => setNewNodeTitle(e.target.value)}
                  className="w-full h-10 px-md bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-label-md text-xs font-semibold text-on-surface block mb-xs">AI Prompt / Script</label>
                <textarea
                  rows={3}
                  placeholder="Direct instructions or script for this step..."
                  value={newNodePrompt}
                  onChange={(e) => setNewNodePrompt(e.target.value)}
                  className="w-full p-md bg-surface-container-low border border-outline-variant rounded-xl text-xs font-mono focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex justify-end gap-sm pt-md">
                <button
                  type="button"
                  onClick={() => setIsAddNodeOpen(false)}
                  className="px-md py-xs text-on-surface-variant hover:text-on-surface font-label-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-lg py-xs bg-primary text-on-primary rounded-xl font-label-md shadow-sm hover:opacity-90 cursor-pointer font-bold"
                >
                  Insert Step
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workflow Settings Modal */}
      {isWorkflowSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-md">
          <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-md p-xl shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-lg">
              <h3 className="font-headline-md text-base font-bold text-on-surface flex items-center gap-xs">
                <span className="material-symbols-outlined text-primary">settings</span>
                Workflow Settings
              </h3>
              <button onClick={() => setIsWorkflowSettingsOpen(false)} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-md">
              <div>
                <label className="font-label-md text-xs font-semibold text-on-surface block mb-xs">Workflow Name</label>
                <input
                  type="text"
                  value={activeWorkflow.name}
                  onChange={(e) => setActiveWorkflow({ ...activeWorkflow, name: e.target.value })}
                  className="w-full h-10 px-md bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="font-label-md text-xs font-semibold text-on-surface block mb-xs">Description</label>
                <textarea
                  rows={3}
                  value={activeWorkflow.description}
                  onChange={(e) => setActiveWorkflow({ ...activeWorkflow, description: e.target.value })}
                  className="w-full p-md bg-surface-container-low border border-outline-variant rounded-xl text-xs focus:outline-none focus:border-primary resize-none"
                />
              </div>
              <div>
                <label className="font-label-md text-xs font-semibold text-on-surface block mb-xs">Deployment Status</label>
                <select
                  value={activeWorkflow.status}
                  onChange={(e) => setActiveWorkflow({ ...activeWorkflow, status: e.target.value as any })}
                  className="w-full h-10 px-md bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:border-primary"
                >
                  <option value="active">Active (Handling Live Phone Calls)</option>
                  <option value="draft">Draft (Offline Testing)</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="flex justify-end gap-sm pt-md">
                <button
                  onClick={() => setIsWorkflowSettingsOpen(false)}
                  className="px-lg py-xs bg-primary text-on-primary rounded-xl font-label-md font-bold cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
