import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export class PeakHourAnalyzer {
  /**
   * Analyzes call volume to determine peak hours for an organization.
   */
  async getPeakHours(organizationId: string, days: number = 30) {
    try {
      // In production, use native SQL date_trunc/extract hour.
      // Scaffold: simple JS grouping
      const calls = await prisma.call.findMany({
        where: {
          organizationId,
          startedAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
        },
        select: { startedAt: true }
      });

      const hourCounts: Record<number, number> = {};
      
      for (const call of calls) {
        if (call.startedAt) {
          const hour = call.startedAt.getHours(); // Local timezone issues apply here, best done in SQL
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
      }

      return hourCounts;
    } catch (err) {
      logger.error(`Error analyzing peak hours: ${err}`);
      return {};
    }
  }
}

export const peakHourAnalyzer = new PeakHourAnalyzer();
