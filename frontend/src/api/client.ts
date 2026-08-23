export function profilePrefix(pathname = window.location.pathname): string {
  const match = pathname.match(/^\/p\/([^/]+)(?:\/|$)/);
  return match ? `/p/${encodeURIComponent(decodeURIComponent(match[1]))}` : "";
}

export function apiPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${profilePrefix()}${normalized}`;
}

let localSessionRefresh: Promise<Response> | null = null;

async function refreshLocalSession(): Promise<boolean> {
  if (!localSessionRefresh) {
    localSessionRefresh = fetch(`${profilePrefix()}/`, {
      credentials: "same-origin",
      cache: "no-store",
    }).finally(() => {
      localSessionRefresh = null;
    });
  }
  return (await localSessionRefresh).ok;
}

export async function fetchWithLocalSessionRecovery(url: string, init?: RequestInit): Promise<Response> {
  let response = await fetch(url, init);
  if (response.status !== 401 || !(await refreshLocalSession())) return response;
  response = await fetch(url, init);
  return response;
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithLocalSessionRecovery(apiPath(path), {
    credentials: "same-origin",
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    let message = `request_failed:${response.status}`;
    try {
      const payload = await response.json() as { error?: string | { message?: string }; message?: string };
      message = typeof payload.error === "string"
        ? payload.error
        : payload.error?.message || payload.message || message;
    } catch {
      // A restarting local service may close without a JSON body.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}
