const apiBaseUrl = process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:8000";

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
}

async function refreshAccessToken() {
  // Try Firebase token refresh first (primary login method)
  if (typeof window !== 'undefined') {
    try {
      const { auth } = await import('@/utils/firebase/config');
      if (auth?.currentUser) {
        const freshToken = await auth.currentUser.getIdToken(true);
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `access_token=Bearer ${freshToken}; path=/; max-age=3600; SameSite=Lax${secure}`;
        return true;
      }
    } catch {
      // Firebase not available — fall through to backend refresh
    }
  }

  // Fallback: backend custom JWT refresh (for non-Firebase sessions)
  try {
    const res = await fetch(`${apiBaseUrl}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiClient(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = endpoint.startsWith("http") ? endpoint : `${apiBaseUrl}${endpoint}`;

  const defaultOptions: RequestInit = {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  const response = await fetch(url, defaultOptions);

  // If 401 Unauthorized, try to refresh
  if (response.status === 401 && !url.includes("/auth/login") && !url.includes("/auth/refresh")) {
    if (!isRefreshing) {
      isRefreshing = true;
      const refreshed = await refreshAccessToken();
      isRefreshing = false;
      
      if (refreshed) {
        onRefreshed("refreshed");
        // Retry original request
        return await fetch(url, defaultOptions);
      } else {
        // Total session failure - clear client state and redirect
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
           window.location.href = "/login?error=Session expired. Please log in again.";
        }
      }
    } else {
      // If already refreshing, wait for it to complete
      return new Promise((resolve) => {
        subscribeTokenRefresh(() => {
          resolve(fetch(url, defaultOptions));
        });
      });
    }
  }

  return response;
}
