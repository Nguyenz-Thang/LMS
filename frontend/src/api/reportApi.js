import { useCallback, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { LMS_BASE_URL } from "./courseApi";

const BASE = `${LMS_BASE_URL}/reports`;

async function toJson(res) {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}

export function useReportApi() {
  const { token, logout } = useContext(AuthContext);

  const authedFetch = useCallback(
    async (url, options = {}) => {
      const headers = {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(url, {
        ...options,
        headers,
      });

      if (res.status === 401 || res.status === 403) {
        logout?.();
        throw new Error("Phiên đăng nhập đã hết hạn hoặc bạn không có quyền.");
      }

      return res;
    },
    [token, logout],
  );

  const getDashboard = useCallback(
    async () => toJson(await authedFetch(`${BASE}/dashboard`)),
    [authedFetch],
  );

  return {
    getDashboard,
  };
}
