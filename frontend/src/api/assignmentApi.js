import { useCallback, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { LMS_BASE_URL } from "./courseApi";

const BASE = `${LMS_BASE_URL}/assignments`;

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

export function useAssignmentApi() {
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
        throw new Error("Phien dang nhap da het han hoac ban khong co quyen.");
      }

      return res;
    },
    [token, logout],
  );

  const listSubmissions = useCallback(
    async (assignmentId) =>
      toJson(await authedFetch(`${BASE}/${assignmentId}/submissions`)),
    [authedFetch],
  );

  const gradeSubmission = useCallback(
    async (submissionId, payload) =>
      toJson(
        await authedFetch(`${BASE}/submissions/${submissionId}/grade`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }),
      ),
    [authedFetch],
  );

  return {
    listSubmissions,
    gradeSubmission,
  };
}
