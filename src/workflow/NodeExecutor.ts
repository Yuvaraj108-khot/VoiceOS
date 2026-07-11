import { transferNode } from './nodes/TransferNode';
import { calendarNode } from './nodes/CalendarNode';
import { emailNode } from './nodes/EmailNode';
import { whatsappNode } from './nodes/WhatsAppNode';
import { webhookNode } from './nodes/WebhookNode';
import { conditionNode } from './nodes/ConditionNode';
import { crmNode } from './nodes/CRMNode';
import { delayNode } from './nodes/DelayNode';
import { logger } from '../lib/logger';

export class NodeExecutor {
  /**
   * Routes the node to its specific handler.
   */
  async execute(node: any, context: Record<string, any>): Promise<{ output: any; branch?: string }> {
    try {
      switch (node.type) {
        case 'transfer':
          return await transferNode.execute(node.data, context);
        case 'calendar':
          return await calendarNode.execute(node.data, context);
        case 'email':
          return await emailNode.execute(node.data, context);
        case 'whatsapp':
          return await whatsappNode.execute(node.data, context);
        case 'webhook':
          return await webhookNode.execute(node.data, context);
        case 'condition':
          return await conditionNode.execute(node.data, context);
        case 'crm':
          return await crmNode.execute(node.data, context);
        case 'delay':
          return await delayNode.execute(node.data, context);
        case 'trigger':
        case 'start':
          return { output: {} }; // Pass-through
        default:
          logger.warn(`Unknown node type: ${node.type}`);
          return { output: {} };
      }
    } catch (error) {
      logger.error(`Error executing node ${node.id} (${node.type}): ${error}`);
      return { output: { error: String(error) }, branch: 'error' };
    }
  }
}

export const nodeExecutor = new NodeExecutor();
