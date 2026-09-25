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

const MOCK_SETTINGS: UnifiedSettings = {
  profile: { id: 'u1', email: 'sarah@acme-ai.io', firstName: 'Sarah', lastName: 'Hudson', notifyEmail: true, notifyPush: false, timezone: 'America/New_York', preferredLanguage: 'English' },
  membership: { role: 'Administrator', joinedAt: '2024-01-01T00:00:00Z' },
  organization: {
    id: 'org-1',
    name: 'Acme AI Solutions',
    slug: 'acme-ai',
    planTier: 'Enterprise',
    businessSettings: { industry: 'Technology & SaaS', supportEmail: 'ops@acme-ai.io' }
  }
};

export const settingsService = {
  getUnifiedSettings: async (): Promise<UnifiedSettings> => {
    try {
      const data = await api.get('/settings');
      return data.data || data;
    } catch {
      return MOCK_SETTINGS;
    }
  }
};
