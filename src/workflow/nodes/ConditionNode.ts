import { logger } from '../../lib/logger';

export const conditionNode = {
  async execute(data: any, context: Record<string, any>) {
    logger.info(`Executing Condition Node`);
    // Basic evaluation logic
    // Ex: data.field = 'sentiment', data.operator = '===', data.value = 'POSITIVE'
    const fieldValue = context[data.field];
    let isTrue = false;

    switch (data.operator) {
      case '===':
        isTrue = fieldValue === data.value;
        break;
      case '!==':
        isTrue = fieldValue !== data.value;
        break;
      case '>':
        isTrue = fieldValue > data.value;
        break;
      case '<':
        isTrue = fieldValue < data.value;
        break;
    }

    // Branching logic is handled by WorkflowEngine via the `branch` return key
    return {
      output: { conditionMet: isTrue },
      branch: isTrue ? 'true_path' : 'false_path'
    };
  }
};
