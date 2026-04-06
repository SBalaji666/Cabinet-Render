/**
 * Axios instance shared across all API calls.
 * Automatically attaches the JWT token from useAuthStore.
 * On 401, clears auth and reloads — forcing the user back to login.
 */

import axios from "axios";
import { useAuthStore } from "../stores/useAuthStore.js";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000/api",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT before every request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle auth errors globally
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);
