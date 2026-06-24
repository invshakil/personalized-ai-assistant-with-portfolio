// Central Axios client for the admin API.
//
// Every admin API route returns `{ data, error }`. This client:
//  - prefixes all calls with `/api/admin`
//  - on success, unwraps and returns the inner `data` payload (typed)
//  - on failure (non-2xx or network), throws an Error carrying the API's
//    `error` message, so callers can `catch (e) { e.message }` uniformly.
//
// Not for: PDF downloads (use window.open with the route URL) or the AI
// streaming endpoint (uses fetch + ReadableStream directly).

import axios, { type AxiosRequestConfig } from "axios";

export const apiClient = axios.create({
  baseURL: "/api/admin",
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err?.response?.data?.error ?? err?.message ?? "Request failed. Please try again.";
    return Promise.reject(new Error(message));
  }
);

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.get(url, config);
  return res.data?.data as T;
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await apiClient.post(url, body, config);
  return res.data?.data as T;
}

export async function apiPut<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await apiClient.put(url, body, config);
  return res.data?.data as T;
}

export async function apiPatch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await apiClient.patch(url, body, config);
  return res.data?.data as T;
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.delete(url, config);
  return res.data?.data as T;
}

/**
 * Multipart upload (FormData). We must NOT set Content-Type ourselves: the
 * browser/axios needs to emit `multipart/form-data; boundary=…` with the
 * generated boundary. Setting a bare `multipart/form-data` (no boundary) makes
 * the xhr adapter forward it verbatim, and the server then parses zero files.
 * Passing `Content-Type: null` removes the JSON default from the instance so
 * axios fills in the boundaried value for this request.
 */
export async function apiUpload<T>(url: string, formData: FormData): Promise<T> {
  const res = await apiClient.post(url, formData, {
    headers: { "Content-Type": null },
  });
  return res.data?.data as T;
}
