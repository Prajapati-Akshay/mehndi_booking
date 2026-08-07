import type { ApiResponse } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface ApiErrorBody {
  success: false;
  message: string;
  errorCode?: string;
  errors?: string[];
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public errorCode?: string, public errors: string[] = []) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    cache: rest.cache ?? 'no-store',
  });

  const json = (await res.json().catch(() => null)) as (ApiResponse<T> | ApiErrorBody) | null;

  if (!res.ok || !json || json.success === false) {
    const body = json as ApiErrorBody | null;
    throw new ApiError(
      body?.message || 'Something went wrong. Please try again.',
      res.status,
      body?.errorCode,
      body?.errors ?? [],
    );
  }

  return (json as ApiResponse<T>).data;
}

export const api = {
  get: <T>(path: string, token?: string) => request<T>(path, { method: 'GET', token }),
  post: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined, token }),
  patch: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined, token }),
  delete: <T>(path: string, token?: string) => request<T>(path, { method: 'DELETE', token }),
};
