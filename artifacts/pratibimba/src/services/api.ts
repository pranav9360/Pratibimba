import axios from "axios";
import { REQUEST_TIMEOUT_MS, handleUnauthorized } from "./request-errors";

const api = axios.create({
  timeout: REQUEST_TIMEOUT_MS,
  baseURL:
    import.meta.env.VITE_API_URL || "https://pratibimba-backend-final.onrender.com/api/v1",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(response => response, error => {
  handleUnauthorized(error?.response?.status, error?.config?.url);
  return Promise.reject(error);
});

export default api;
