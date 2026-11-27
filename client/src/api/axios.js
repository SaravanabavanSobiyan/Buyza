import axios from "axios";
import { normalizeAxiosError } from "./normalizeError";
import { notifyApiFailure } from "./notifyApiFailure";
import { reportError } from "../utils/reportError";

const baseURL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({ baseURL, withCredentials: true, timeout: 30_000 });
const raw = axios.create({ baseURL, withCredentials: true }); // no interceptors (used for refresh)

// The access token lives in memory only (never localStorage).
// After a page reload it's restored from the httpOnly refresh cookie.
let accessToken = null;
let suspensionNotified = false;
export const setAccessToken = (token) => {
  accessToken = token;
};

// One refresh at a time: concurrent callers share the same request
let refreshPromise = null;
export function refreshSession() {
  refreshPromise ||= raw
    .post("/auth/refresh", undefined, { headers: { "X-Requested-With": "XMLHttpRequest" } })
    .then((res) => {
      accessToken = res.data.data.accessToken;
      return res.data.data; // { user, accessToken }
    })
    .catch((error) => {
      normalizeAxiosError(error);
      notifyApiFailure(error);
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    normalizeAxiosError(error);
    notifyApiFailure(error);
    const original = error.config;
    const isAuthCall = original?.url?.startsWith("/auth/");

    const isSuspended =
      error.response?.status === 403 &&
      error.response?.data?.code === "ACCOUNT_SUSPENDED";
    if (error.response?.status >= 500) {
      reportError(error, { url: original?.url, status: error.response.status });
    }
    if (isSuspended && !isAuthCall && !suspensionNotified) {
      suspensionNotified = true;
      accessToken = null;
      window.dispatchEvent(new Event("auth:suspended"));
    }

    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        await refreshSession();
        return api(original); // retry with the new token
      } catch (refreshError) {
        accessToken = null;
        if (
          refreshError.response?.status === 403 &&
          refreshError.response?.data?.code === "ACCOUNT_SUSPENDED"
        ) {
          if (!suspensionNotified) {
            suspensionNotified = true;
            window.dispatchEvent(new Event("auth:suspended"));
          }
        } else {
          window.dispatchEvent(new Event("auth:expired"));
        }
      }
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (error, fallback = "Something went wrong. Try again.") => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === "ERR_NETWORK" || !error?.response) {
    return "Unable to reach the server. Start the server on port 5000 and try again.";
  }
  return fallback;
};

// Turns server validation details into { field: message } for form errors
export const getFieldErrors = (error) => {
  const details = error?.response?.data?.details;
  if (!Array.isArray(details)) return {};
  return details.reduce((acc, d) => (d.field && !acc[d.field] ? { ...acc, [d.field]: d.message } : acc), {});
};

export default api;
