import { api } from '../api';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationsService = {
  list: async (): Promise<Notification[]> => {
    const data = await api.get('/notifications');
    return data.data || data;
  },

  markAllAsRead: async (): Promise<void> => {
    await api.post('/notifications/mark-all-read');
  },

  markAsRead: async (id: string): Promise<Notification> => {
    const data = await api.put(`/notifications/${id}/read`);
    return data.data || data;
  }
};
