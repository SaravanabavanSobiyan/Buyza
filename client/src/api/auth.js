import api, { setAccessToken } from "./axios";

const apiBaseUrl = import.meta.env.VITE_API_URL || "/api";
export const getOAuthUrl = (provider) => `${apiBaseUrl}/auth/${provider}`;

export async function registerUser(payload) {
  const { data } = await api.post("/auth/register", payload);
  setAccessToken(data.data.accessToken);
  return data.data.user;
}

export async function loginUser(payload) {
  const { data } = await api.post("/auth/login", payload);
  setAccessToken(data.data.accessToken);
  return data.data.user;
}

export async function logoutUser() {
  try {
    await api.post("/auth/logout");
  } finally {
    setAccessToken(null);
  }
}

export const forgotPassword = async (email) => (await api.post("/auth/forgot-password", { email })).data;

export const resetPassword = async (token, payload) =>
  (await api.post(`/auth/reset-password/${token}`, payload)).data;
