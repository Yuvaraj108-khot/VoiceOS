import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export class ReportGenerator {
  /**
   * Generates a monthly summary report string (e.g. for email delivery)
   */
  async generateMonthlyReport(organizationId: string, month: number, year: number): Promise<string> {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const [totalCalls, completedCalls, failedCalls] = await Promise.all([
        prisma.call.count({ where: { organizationId, startedAt: { gte: startDate, lte: endDate } } }),
        prisma.call.count({ where: { organizationId, status: 'COMPLETED', startedAt: { gte: startDate, lte: endDate } } }),
        prisma.call.count({ where: { organizationId, status: 'FAILED', startedAt: { gte: startDate, lte: endDate } } }),
      ]);

      let report = `Monthly Report for ${month}/${year}\n`;
      report += `---------------------------------\n`;
      report += `Total Calls: ${totalCalls}\n`;
      report += `Completed: ${completedCalls}\n`;
      report += `Failed: ${failedCalls}\n`;
      
      return report;
    } catch (err) {
      logger.error(`Error generating report: ${err}`);
      return 'Error generating report';
    }
  }
}

export const reportGenerator = new ReportGenerator();
