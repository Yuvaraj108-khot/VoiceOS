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
  activeEmployees: 0,
  totalCalls: 0,
  avgDuration: '0m 0s',
  successRate: 0,
  costSaved: 0,
};

export const analyticsService = {
  getOverview: async (): Promise<AnalyticsOverview> => {
    try {
      const data = await api.get('/analytics/overview');
      const payload = data?.data || data;
      if (!payload || typeof payload !== 'object' || typeof payload.totalCalls !== 'number') {
        return MOCK_OVERVIEW;
      }
      return {
        ...MOCK_OVERVIEW,
        ...payload
      };
    } catch {
      return MOCK_OVERVIEW;
    }
  },

  getTrend: async (): Promise<AnalyticsTrend[]> => {
    try {
      const data = await api.get('/analytics/trend');
      return data.data || data;
    } catch {
      return [];
    }
  }
};
