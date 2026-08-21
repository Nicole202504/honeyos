export function profilePrefix(pathname = window.location.pathname): string {
  const match = pathname.match(/^\/p\/([^/]+)(?:\/|$)/);
  return match ? `/p/${encodeURIComponent(decodeURIComponent(match[1]))}` : "";
}

export function apiPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${profilePrefix()}${normalized}`;
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiPath(path), {
    credentials: "same-origin",
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`request_failed:${response.status}`);
  }
  return response.json() as Promise<T>;
}
