import { useCallback } from "react";
import { LMS_BASE_URL, toJson, useAuthedFetch } from "./authFetch";

const BASE = `${LMS_BASE_URL}/reports`;

export function useReportApi() {
  const authedFetch = useAuthedFetch();
  const getDashboard = useCallback(
    async (params = {}) => {
      const searchParams = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          searchParams.set(key, String(value).trim());
        }
      });

      const query = searchParams.toString();
      return toJson(await authedFetch(`${BASE}/dashboard${query ? `?${query}` : ""}`));
    },
    [authedFetch],
  );

  return {
    getDashboard,
  };
}
