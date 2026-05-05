import { useContext, useCallback } from "react";
import { AuthContext } from "../context/AuthContext";

const BASE = "http://localhost:8080/lms/lessons";

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

export function useLessonApi() {
  const { token, logout } = useContext(AuthContext);
  const RESOURCE_BASE = `${BASE}`;

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

  const createLesson = useCallback(
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

  const updateLesson = useCallback(
    async (lessonId, payload) =>
      toJson(
        await authedFetch(`${BASE}/${lessonId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }),
      ),
    [authedFetch],
  );

  const deleteLesson = useCallback(
    async (lessonId) =>
      toJson(
        await authedFetch(`${BASE}/${lessonId}`, {
          method: "DELETE",
        }),
      ),
    [authedFetch],
  );

  const getLessonById = useCallback(
    async (lessonId) => toJson(await authedFetch(`${BASE}/${lessonId}`)),
    [authedFetch],
  );

  const getLessonResources = useCallback(
    async (lessonId) =>
      toJson(await authedFetch(`${RESOURCE_BASE}/${lessonId}/resources`)),
    [authedFetch, RESOURCE_BASE],
  );

  const createLessonResource = useCallback(
    async (lessonId, payload) =>
      toJson(
        await authedFetch(`${RESOURCE_BASE}/${lessonId}/resources`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }),
      ),
    [authedFetch, RESOURCE_BASE],
  );

  const updateLessonResource = useCallback(
    async (lessonId, resourceId, payload) =>
      toJson(
        await authedFetch(`${RESOURCE_BASE}/${lessonId}/resources/${resourceId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }),
      ),
    [authedFetch, RESOURCE_BASE],
  );

  const deleteLessonResource = useCallback(
    async (lessonId, resourceId) =>
      toJson(
        await authedFetch(`${RESOURCE_BASE}/${lessonId}/resources/${resourceId}`, {
          method: "DELETE",
        }),
      ),
    [authedFetch, RESOURCE_BASE],
  );

  return {
    createLesson,
    updateLesson,
    deleteLesson,
    getLessonById,
    getLessonResources,
    createLessonResource,
    updateLessonResource,
    deleteLessonResource,
  };
}
