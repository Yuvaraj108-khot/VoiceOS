import { api } from '../api';

export interface AnalyticsOverview {
  activeEmployees: number;
  totalCalls: number;
  avgDuration: string;
  successRate: number;
  costSaved: number;
}

export interface AnalyticsTrend {
  date: string;
  calls: number;
  cost: number;
}

const MOCK_OVERVIEW: AnalyticsOverview = {
  activeEmployees: 12,
  totalCalls: 15420,
  avgDuration: '4m 32s',
  successRate: 91.4,
  costSaved: 82400,
};

export const analyticsService = {
  getOverview: async (): Promise<AnalyticsOverview> => {
    try {
      const data = await api.get('/analytics/overview');
      return data.data || data;
    } catch {
      return MOCK_OVERVIEW;
    }
  },

  getTrend: async (): Promise<AnalyticsTrend[]> => {
    try {
      const data = await api.get('/analytics/trend');
      return data.data || data;
    } catch {
      return [
        { date: '2024-09-01', calls: 1200, cost: 2400 },
        { date: '2024-09-08', calls: 1540, cost: 3080 },
        { date: '2024-09-15', calls: 1380, cost: 2760 },
        { date: '2024-09-22', calls: 1820, cost: 3640 },
      ];
    }
  }
};
