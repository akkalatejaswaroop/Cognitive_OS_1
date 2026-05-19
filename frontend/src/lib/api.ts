const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function refreshAccessToken() {
  try {
    const res = await fetch(`${apiBaseUrl}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch (error) {
    return false;
  }
}

export async function apiClient(endpoint: string, options: RequestInit = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${apiBaseUrl}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  let response = await fetch(url, defaultOptions);

  // If 401, try to refresh token and retry once
  if (response.status === 401 && !url.includes("/auth/login") && !url.includes("/auth/refresh")) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await fetch(url, defaultOptions);
    }
  }

  return response;
}
