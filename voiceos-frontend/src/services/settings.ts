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

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Administrator' | 'Developer' | 'Agent' | 'Viewer';
  lastActive: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  key: string;
  env: 'Production' | 'Sandbox' | 'Development';
  created: string;
}

let MOCK_SETTINGS: UnifiedSettings = {
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

let MOCK_MEMBERS: TeamMember[] = [
  { id: 'm1', name: 'Sarah Hudson', email: 'sarah@acme-ai.io', role: 'Administrator', lastActive: '2 mins ago' },
  { id: 'm2', name: 'Marcus King', email: 'marcus@acme-ai.io', role: 'Developer', lastActive: '14 hours ago' },
  { id: 'm3', name: 'Alex Rivera', email: 'alex@acme-ai.io', role: 'Agent', lastActive: '3 days ago' },
];

let MOCK_KEYS: ApiKeyItem[] = [
  { id: 'k1', name: 'Live Production Key', key: 'api_key_live_9f82b7c41a2938e5d0124d2a', env: 'Production', created: '2024-08-10' },
  { id: 'k2', name: 'Sandbox Test Key', key: 'api_key_test_5e31a80d4f6c91b2c7849x77', env: 'Sandbox', created: '2024-09-01' },
];

export const settingsService = {
  getUnifiedSettings: async (): Promise<UnifiedSettings> => {
    try {
      const data = await api.get('/settings');
      return data.data || data;
    } catch {
      return MOCK_SETTINGS;
    }
  },

  updateBusinessProfile: async (name: string, industry: string, supportEmail: string): Promise<UnifiedSettings> => {
    try {
      const data = await api.put('/settings/organization', { name, industry, supportEmail });
      return data.data || data;
    } catch {
      MOCK_SETTINGS = {
        ...MOCK_SETTINGS,
        organization: {
          ...MOCK_SETTINGS.organization,
          name,
          businessSettings: {
            ...MOCK_SETTINGS.organization.businessSettings,
            industry,
            supportEmail
          }
        }
      };
      return MOCK_SETTINGS;
    }
  },

  getTeamMembers: async (): Promise<TeamMember[]> => {
    return [...MOCK_MEMBERS];
  },

  inviteMember: async (member: Omit<TeamMember, 'id' | 'lastActive'>): Promise<TeamMember> => {
    const newMember: TeamMember = {
      ...member,
      id: `m_${Date.now()}`,
      lastActive: 'Just invited'
    };
    MOCK_MEMBERS.push(newMember);
    return newMember;
  },

  removeMember: async (id: string): Promise<boolean> => {
    MOCK_MEMBERS = MOCK_MEMBERS.filter(m => m.id !== id);
    return true;
  },

  getApiKeys: async (): Promise<ApiKeyItem[]> => {
    return [...MOCK_KEYS];
  },

  createApiKey: async (name: string, env: 'Production' | 'Sandbox' | 'Development'): Promise<ApiKeyItem> => {
    const prefix = env === 'Production' ? 'api_key_live_' : 'api_key_test_';
    const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const newKey: ApiKeyItem = {
      id: `k_${Date.now()}`,
      name,
      key: `${prefix}${randomHex}`,
      env,
      created: new Date().toISOString().split('T')[0]
    };
    MOCK_KEYS.push(newKey);
    return newKey;
  },

  deleteApiKey: async (id: string): Promise<boolean> => {
    MOCK_KEYS = MOCK_KEYS.filter(k => k.id !== id);
    return true;
  }
};
