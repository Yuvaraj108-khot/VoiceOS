export type WorkflowNodeType =
  | 'TRANSFER'
  | 'CALENDAR'
  | 'EMAIL'
  | 'WEBHOOK'
  | 'CONDITION'
  | 'DELAY'
  | 'START'
  | 'END'
  | 'SMS'
  | 'AI_PROCESS';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  label: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: Record<string, unknown>;
  triggerConfig: {
    onCallStart?: boolean;
    onIntent?: string[];
    onKeyword?: string[];
    onTransfer?: boolean;
  };
}

export interface WorkflowExecutionContext {
  executionId: string;
  workflowId: string;
  callId?: string;
  organizationId: string;
  variables: Record<string, unknown>;
  currentNodeId: string | null;
  logs: WorkflowLog[];
}

export interface WorkflowLog {
  nodeId: string;
  nodeType: WorkflowNodeType;
  status: 'success' | 'error' | 'skipped';
  output?: unknown;
  error?: string;
  timestamp: Date;
  durationMs: number;
}

export interface NodeExecutionResult {
  success: boolean;
  output?: unknown;
  nextNodeId?: string;
  error?: string;
}

// Node-specific configs
export interface TransferNodeConfig {
  phoneNumber: string;
  message?: string;
  warmTransfer: boolean;
}

export interface CalendarNodeConfig {
  employeeId: string;
  duration: number;
  title: string;
  description?: string;
  sendConfirmation: boolean;
}

export interface EmailNodeConfig {
  to: string | '{{caller.email}}';
  subject: string;
  templateId?: string;
  body?: string;
  variables?: Record<string, string>;
}

export interface WebhookNodeConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  timeout?: number;
}

export interface ConditionNodeConfig {
  expression: string;
  trueNodeId: string;
  falseNodeId: string;
}

export interface DelayNodeConfig {
  delayMs: number;
}
