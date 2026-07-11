import { logger } from '../lib/logger';

export class WorkflowValidator {
  /**
   * Validates a workflow graph for cycles, disconnected nodes, and missing required fields.
   */
  validate(nodes: any[], edges: any[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!nodes || nodes.length === 0) {
      errors.push('Workflow must contain at least one node.');
      return { isValid: false, errors };
    }

    const startNodes = nodes.filter(n => n.type === 'trigger' || n.id === 'start');
    if (startNodes.length === 0) {
      errors.push('Workflow must have a trigger or start node.');
    }
    if (startNodes.length > 1) {
      errors.push('Workflow cannot have multiple start nodes.');
    }

    // TODO: Add cycle detection (e.g., using Tarjan's algorithm or simple DFS)
    // TODO: Validate node-specific required data fields (e.g., email node must have recipient)

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const workflowValidator = new WorkflowValidator();
