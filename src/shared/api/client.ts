const BASE = "/api/v1";
const TOKEN_KEY = "bg.token";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let token: string | null = null;
let refreshAuth: (() => Promise<void>) | null = null;

try {
  token = sessionStorage.getItem(TOKEN_KEY);
} catch {
  /* sessionStorage can be unavailable in some webviews */
}

export function setToken(value: string | null): void {
  token = value;
  try {
    if (value === null) {
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, value);
    }
  } catch {
    /* in-memory token still works */
  }
}

export function getToken(): string | null {
  return token;
}

/* Registered by the auth module; on 401 the request is retried once after re-auth. */
export function registerAuthRefresh(fn: () => Promise<void>): void {
  refreshAuth = fn;
}

async function request<T>(path: string, init?: RequestInit, allowRetry = true): Promise<T> {
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 401 && allowRetry && refreshAuth) {
    await refreshAuth();
    return request<T>(path, init, false);
  }
  if (res.status === 204) {
    return undefined as T;
  }

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      body !== null && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : res.statusText;
    throw new ApiError(res.status, message);
  }
  return body as T;
}

/* fetch cannot report upload progress, so the one request that carries a photo goes
   through XHR. Everything else stays on fetch. */
function upload<T>(
  path: string,
  form: FormData,
  onProgress?: (fraction: number) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}${path}`);
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(event.loaded / event.total);
      }
    };
    xhr.onload = () => {
      const body: unknown = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        resolve(body as T);
        return;
      }
      const message =
        body !== null && typeof body === "object" && "error" in body
          ? String((body as { error: unknown }).error)
          : xhr.statusText;
      reject(new ApiError(xhr.status, message));
    };
    xhr.onerror = () => reject(new ApiError(0, "network error"));
    xhr.send(form);
  });
}

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>(path);
  },
  /* photos live in a private bucket, so they are fetched with the Bearer token and
     turned into an object URL rather than being pointed at with a plain <img src> */
  async getBlob(path: string): Promise<Blob> {
    const headers = new Headers();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const res = await fetch(`${BASE}${path}`, { headers });
    if (!res.ok) {
      throw new ApiError(res.status, res.statusText);
    }
    return res.blob();
  },
  upload,
  post<T>(path: string, json?: unknown): Promise<T> {
    return request<T>(path, {
      method: "POST",
      headers: json === undefined ? undefined : { "Content-Type": "application/json" },
      body: json === undefined ? undefined : JSON.stringify(json),
    });
  },
  postForm<T>(path: string, form: FormData): Promise<T> {
    return request<T>(path, { method: "POST", body: form });
  },
  putForm<T>(path: string, form: FormData): Promise<T> {
    return request<T>(path, { method: "PUT", body: form });
  },
  patch<T>(path: string, json: unknown): Promise<T> {
    return request<T>(path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(json),
    });
  },
  del(path: string): Promise<void> {
    return request<void>(path, { method: "DELETE" });
  },
};
