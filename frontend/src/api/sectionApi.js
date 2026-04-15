import { useContext, useCallback } from "react";
import { AuthContext } from "../context/AuthContext";

const BASE = "http://localhost:8080/lms/sections";

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

export function useSectionApi() {
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

  const createSection = useCallback(
    async (payload) =>
      toJson(
        await authedFetch(BASE, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }),
      ),
    [authedFetch],
  );

  const updateSection = useCallback(
    async (sectionId, payload) =>
      toJson(
        await authedFetch(`${BASE}/${sectionId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }),
      ),
    [authedFetch],
  );

  const deleteSection = useCallback(
    async (sectionId) =>
      toJson(
        await authedFetch(`${BASE}/${sectionId}`, {
          method: "DELETE",
        }),
      ),
    [authedFetch],
  );

  const getSectionById = useCallback(
    async (sectionId) => toJson(await authedFetch(`${BASE}/${sectionId}`)),
    [authedFetch],
  );

  return {
    createSection,
    updateSection,
    deleteSection,
    getSectionById,
  };
}
