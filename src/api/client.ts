const BASE_URL = 'https://health.googleapis.com/v4';

let _refreshFn: (() => Promise<string | null>) | null = null;

export function setRefreshFn(fn: () => Promise<string | null>) {
  _refreshFn = fn;
}

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const CACHE_TTL_MS = 60 * 1000;
const responseCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<unknown>>();

function getCacheKey(path: string, options: RequestInit): string {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? String(options.body) : '';
  return `${method}:${path}:${body}`;
}

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function healthFetch<T>(
  path: string,
  accessToken: string,
  options: RequestInit = {},
  retryCount: number = 0
): Promise<T> {
  const cacheKey = getCacheKey(path, options);

  // Return cached result if fresh
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as T;
  }

  // Deduplicate identical in-flight requests
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey) as Promise<T>;
  }

  const execution = (async (): Promise<T> => {
    let token = accessToken;

    const doRequest = async (authToken: string) => {
      return fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
    };

    let response = await doRequest(token);

    // On 401, try refreshing the token once
    if (response.status === 401 && _refreshFn) {
      const newToken = await _refreshFn();
      if (newToken) {
        token = newToken;
        response = await doRequest(token);
      }
    }

    // On 429 (Rate Limit Exceeded), wait and retry with backoff
    if (response.status === 429 && retryCount < 2) {
      const retryAfterHeader = response.headers.get('Retry-After');
      const waitSeconds = retryAfterHeader
        ? parseInt(retryAfterHeader, 10) || 3
        : (retryCount + 1) * 3;
      await wait(waitSeconds * 1000);
      return healthFetch<T>(path, token, options, retryCount + 1);
    }

    if (!response.ok) {
      const errorText = await response.text();
      let message = `Health API error (${response.status})`;
      try {
        const json = JSON.parse(errorText);
        if (json?.error?.message) {
          message = `Health API (${response.status}): ${json.error.message}`;
        }
      } catch {}
      throw new Error(message);
    }

    const data = (await response.json()) as T;
    responseCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  })();

  inFlightRequests.set(cacheKey, execution);

  try {
    return await execution;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}
