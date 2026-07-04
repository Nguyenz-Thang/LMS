import { useCallback, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export const LMS_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/lms";

export async function toJson(res) {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}

export function useAuthedFetch({
  logoutOnForbidden = true,
  unauthorizedMessage = "Phien dang nhap da het han hoac ban khong co quyen.",
} = {}) {
  const { token, logout } = useContext(AuthContext);

  return useCallback(
    async (url, options = {}) => {
      const headers = {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(url, {
        ...options,
        headers,
      });

      if (res.status === 401 || (logoutOnForbidden && res.status === 403)) {
        logout?.();
        throw new Error(unauthorizedMessage);
      }

      return res;
    },
    [token, logout, logoutOnForbidden, unauthorizedMessage],
  );
}
