import { prisma } from '../../../lib/prisma';
import { Prisma } from '@prisma/client';

export const analyticsService = {
  async getOverview(organizationId: string, startDate: Date, endDate: Date) {
    const whereClause: Prisma.CallWhereInput = {
      organizationId,
      startedAt: { gte: startDate, lte: endDate },
    };

    // 1. Total Calls
    const totalCalls = await prisma.call.count({ where: whereClause });

    // 2. Average Duration
    const durationAgg = await prisma.call.aggregate({
      where: whereClause,
      _avg: { duration: true },
    });
    const avgDuration = durationAgg._avg.duration || 0;

    // 3. Sentiment breakdown
    const sentiments = await prisma.call.groupBy({
      by: ['sentiment'],
      where: { ...whereClause, sentiment: { not: null } },
      _count: true,
    });

    const sentimentSummary = {
      positive: sentiments.find(s => s.sentiment === 'POSITIVE')?._count || 0,
      neutral: sentiments.find(s => s.sentiment === 'NEUTRAL')?._count || 0,
      negative: sentiments.find(s => s.sentiment === 'NEGATIVE')?._count || 0,
    };

    // 4. Outcomes (completed vs failed vs missed)
    const outcomes = await prisma.call.groupBy({
      by: ['status'],
      where: whereClause,
      _count: true,
    });

    const outcomeSummary = outcomes.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCalls,
      avgDurationSeconds: Math.round(avgDuration),
      sentimentSummary,
      outcomeSummary,
    };
  },

  async getDailyTrend(organizationId: string, startDate: Date, endDate: Date) {
    // Note: A raw query is usually better for time-series grouping, but we'll simulate 
    // it here by fetching and grouping in memory for this scaffold. 
    // In production, use `prisma.$queryRaw` with `date_trunc('day', startedAt)`.
    
    const calls = await prisma.call.findMany({
      where: {
        organizationId,
        startedAt: { gte: startDate, lte: endDate },
      },
      select: { startedAt: true, duration: true }
    });

    const dailyStats: Record<string, { count: number; totalDuration: number }> = {};

    calls.forEach(call => {
      if (!call.startedAt) return;
      const dateStr = call.startedAt.toISOString().split('T')[0];
      if (!dailyStats[dateStr]) {
        dailyStats[dateStr] = { count: 0, totalDuration: 0 };
      }
      dailyStats[dateStr].count += 1;
      dailyStats[dateStr].totalDuration += (call.duration || 0);
    });

    return Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        count: stats.count,
        avgDuration: stats.count ? Math.round(stats.totalDuration / stats.count) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
};
