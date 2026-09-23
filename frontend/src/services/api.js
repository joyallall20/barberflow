import axios from "axios";
import { getIdToken } from "./authService";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api",

  headers: {
    "Content-Type": "application/json",
  },
});

/*
 * Attach the current Firebase ID token to every API request.
 *
 * We fetch the token at request time instead of storing a token
 * permanently in Axios defaults. Firebase can refresh ID tokens,
 * so the request should always use the current token.
 */
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getIdToken();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        delete config.headers.Authorization;
      }
    } catch (error) {
      console.error("Failed to attach Firebase token:", error);
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Request failed";

    return Promise.reject({
      status,
      message,
      data: error.response?.data ?? null,
      isAuthError: status === 401,
      isForbidden: status === 403,
      isNotFound: status === 404,
      original: error,
    });
  }
);

export default api;