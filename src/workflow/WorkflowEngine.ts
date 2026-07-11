import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { nodeExecutor } from './NodeExecutor';

export class WorkflowEngine {
  /**
   * Triggers a workflow by its ID or by Intent mapping.
   */
  async triggerWorkflow(workflowId: string, context: Record<string, any>) {
    try {
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId }
      });

      if (!workflow || !workflow.isActive) {
        logger.warn(`Workflow ${workflowId} is inactive or deleted.`);
        return;
      }

      logger.info(`Starting Workflow: ${workflow.name} (ID: ${workflowId})`);

      // Find the trigger/start node
      const nodes = workflow.nodes as any[];
      const edges = workflow.edges as any[];
      
      const startNode = nodes.find(n => n.type === 'trigger' || n.id === 'start');
      if (!startNode) {
        throw new Error('No start node found in workflow');
      }

      // Execute graph
      await this.executeNode(startNode, nodes, edges, context, workflowId);

    } catch (error) {
      logger.error(`Error executing workflow ${workflowId}: ${error}`);
    }
  }

  private async executeNode(
    currentNode: any,
    nodes: any[],
    edges: any[],
    context: Record<string, any>,
    workflowId: string
  ) {
    // 1. Execute the current node
    const result = await nodeExecutor.execute(currentNode, context);

    // 2. Log execution (Scaffolding: simple console log)
    logger.debug(`Executed node ${currentNode.id} (${currentNode.type}) with result: ${JSON.stringify(result)}`);

    // 3. Find next nodes based on edges
    const outgoingEdges = edges.filter(e => e.source === currentNode.id);
    
    for (const edge of outgoingEdges) {
      // If node returned a specific routing key (e.g. condition branch), follow that edge
      if (result.branch && edge.sourceHandle !== result.branch) {
        continue;
      }

      const nextNode = nodes.find(n => n.id === edge.target);
      if (nextNode) {
        // Recursively execute next node
        await this.executeNode(nextNode, nodes, edges, { ...context, ...result.output }, workflowId);
      }
    }
  }
}

export const workflowEngine = new WorkflowEngine();
