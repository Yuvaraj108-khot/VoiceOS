import { api } from '../api';

export interface BusinessSettings {
  id?: string;
  industry?: string;
  supportEmail?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  planTier: string;
  businessSettings: BusinessSettings | null;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  preferredLanguage?: string;
  timezone?: string;
  notifyEmail: boolean;
  notifyPush: boolean;
}

export interface Membership {
  role: string;
  joinedAt: string;
}

export interface UnifiedSettings {
  profile: UserProfile;
  membership: Membership;
  organization: Organization;
}

export const settingsService = {
  getUnifiedSettings: async (): Promise<UnifiedSettings> => {
    const data = await api.get('/settings');
    return data.data || data;
  }
};
