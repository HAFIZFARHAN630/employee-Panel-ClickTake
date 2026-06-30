// When deployed on Firebase, API calls must go to the Render backend.
// When on Render (self-hosted), API calls are relative (same origin).
// Falls back to "" (relative) in dev mode.
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, headers: customHeaders, ...restOptions } = options;

  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const headers: Record<string, string> = {
    // Only set Content-Type for requests with a body (POST/PUT/PATCH)
    ...(restOptions.body ? { "Content-Type": "application/json" } : {}),
    ...(customHeaders as Record<string, string>),
  };

  // Get token from localStorage if not in headers
  if (!headers["Authorization"]) {
    if (typeof window !== "undefined") {
      const authData = localStorage.getItem("ems_auth");
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          if (parsed.token) {
            headers["Authorization"] = `Bearer ${parsed.token}`;
          }
        } catch {
          // Corrupted auth data — clear it
          localStorage.removeItem("ems_auth");
        }
      }
    }
  }

  const res = await fetch(url, { ...restOptions, headers });

  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    let message = `HTTP ${res.status}`;
    if (contentType.includes("application/json")) {
      try {
        const error = await res.json();
        message = error.message || message;
      } catch {
        // JSON parse failed, use default message
      }
    }
    throw new Error(message);
  }

  // Handle 204 No Content (no body to parse)
  if (res.status === 204) {
    return undefined as T;
  }

  // Guard against HTML responses on success path
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Expected JSON but received ${contentType}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string>) =>
    apiFetch<T>(endpoint, { method: "GET", params }),

  post: <T>(endpoint: string, body?: unknown) =>
    apiFetch<T>(endpoint, { method: "POST", body: body ? JSON.stringify(body) : undefined }),

  put: <T>(endpoint: string, body?: unknown) =>
    apiFetch<T>(endpoint, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),

  patch: <T>(endpoint: string, body?: unknown) =>
    apiFetch<T>(endpoint, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),

  delete: <T>(endpoint: string, body?: Record<string, string>) =>
    apiFetch<T>(endpoint, {
      method: "DELETE",
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
};

// Persist auth helper
export function persistAuth(user: unknown, token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("ems_auth", JSON.stringify({ user, token }));
  }
}

export function clearAuth() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("ems_auth");
  }
}

export function getStoredAuth(): { user: unknown; token: string } | null {
  if (typeof window !== "undefined") {
    const data = localStorage.getItem("ems_auth");
    if (data) {
      try { return JSON.parse(data); } catch { return null; }
    }
  }
  return null;
}