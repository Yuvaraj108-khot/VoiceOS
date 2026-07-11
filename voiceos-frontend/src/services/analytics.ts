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

export const analyticsService = {
  getOverview: async (): Promise<AnalyticsOverview> => {
    const data = await api.get('/analytics/overview');
    return data.data || data;
  },

  getTrend: async (): Promise<AnalyticsTrend[]> => {
    const data = await api.get('/analytics/trend');
    return data.data || data;
  }
};
