const API_URL = 'http://localhost:4009/v1';

const getHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

// Safe fetch wrapper that handles network offline/timeout gracefully without throwing AbortError
const safeFetch = async (url: string, options: RequestInit = {}, timeoutMs = 15000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    try {
      controller.abort();
    } catch {}
  }, timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return res;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError' || err.message?.includes('aborted')) {
      console.warn(`[API] Network request to ${url} timed out after ${timeoutMs}ms`);
      return {
        ok: false,
        status: 408,
        json: async () => ({ error: { message: 'Request timed out' } })
      } as any;
    }
    throw err;
  }
};

// Client-side L1 Cache to make tab switching & page navigation instantaneous
interface CacheEntry {
  data: any;
  timestamp: number;
}
const clientCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 25000; // 25 seconds fresh window

export const api = {
  get: async (endpoint: string, bypassCache = false) => {
    const now = Date.now();
    const cached = clientCache.get(endpoint);

    // Return instant cached data if available and fresh
    if (!bypassCache && cached && (now - cached.timestamp < CACHE_TTL_MS)) {
      return cached.data;
    }

    try {
      const res = await safeFetch(`${API_URL}${endpoint}`, {
        headers: getHeaders()
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.warn(`[API GET ${endpoint}] HTTP ${res.status}`);
        // If we have stale cache, fallback to it rather than crashing
        if (cached) return cached.data;
        return data;
      }
      // Store in memory cache
      clientCache.set(endpoint, { data, timestamp: now });
      return data;
    } catch (err: any) {
      console.warn(`[API GET ${endpoint}] Network error: ${err.message}`);
      if (cached) return cached.data;
      return {};
    }
  },
  
  post: async (endpoint: string, body: any) => {
    // Invalidate cache on mutations
    clientCache.clear();
    try {
      const res = await safeFetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.warn(`[API POST ${endpoint}] HTTP ${res.status}`);
        return data;
      }
      return data;
    } catch (err: any) {
      console.warn(`[API POST ${endpoint}] Network error: ${err.message}`);
      return {};
    }
  },
  
  delete: async (endpoint: string) => {
    // Invalidate cache on mutations
    clientCache.clear();
    try {
      const res = await safeFetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.warn(`[API DELETE ${endpoint}] HTTP ${res.status}`);
        return data;
      }
      return data;
    } catch (err: any) {
      console.warn(`[API DELETE ${endpoint}] Network error: ${err.message}`);
      return {};
    }
  },
  
  put: async (endpoint: string, body?: any) => {
    // Invalidate cache on mutations
    clientCache.clear();
    try {
      const res = await safeFetch(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.warn(`[API PUT ${endpoint}] HTTP ${res.status}`);
        return data;
      }
      return data;
    } catch (err: any) {
      console.warn(`[API PUT ${endpoint}] Network error: ${err.message}`);
      return {};
    }
  },

  patch: async (endpoint: string, body?: any) => {
    // Invalidate cache on mutations
    clientCache.clear();
    try {
      const res = await safeFetch(`${API_URL}${endpoint}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.warn(`[API PATCH ${endpoint}] HTTP ${res.status}`);
        return data;
      }
      return data;
    } catch (err: any) {
      console.warn(`[API PATCH ${endpoint}] Network error: ${err.message}`);
      return {};
    }
  },

  clearCache: () => {
    clientCache.clear();
  }
};
