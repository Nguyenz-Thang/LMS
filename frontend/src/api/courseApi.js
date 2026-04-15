import { useContext, useCallback } from "react";
import { AuthContext } from "../context/AuthContext";

export const LMS_BASE_URL = "http://localhost:8080/lms";
const BASE = `${LMS_BASE_URL}/courses`;

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

export function useCourseApi() {
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

  const listCourses = useCallback(
    async ({ keyword = "", page = 0, size = 6 } = {}) => {
      const searchParams = new URLSearchParams();

      if (keyword?.trim()) searchParams.set("keyword", keyword.trim());
      searchParams.set("page", page);
      searchParams.set("size", size);

      return toJson(await authedFetch(`${BASE}?${searchParams.toString()}`));
    },
    [authedFetch],
  );

  const getCourseById = useCallback(
    async (courseId) => toJson(await authedFetch(`${BASE}/${courseId}`)),
    [authedFetch],
  );

  const getCourseCurriculum = useCallback(
    async (courseId) =>
      toJson(await authedFetch(`${BASE}/${courseId}/curriculum`)),
    [authedFetch],
  );

  const createCourse = useCallback(
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

  const updateCourse = useCallback(
    async (courseId, payload) =>
      toJson(
        await authedFetch(`${BASE}/${courseId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }),
      ),
    [authedFetch],
  );

  const deleteCourse = useCallback(
    async (courseId) =>
      toJson(
        await authedFetch(`${BASE}/${courseId}`, {
          method: "DELETE",
        }),
      ),
    [authedFetch],
  );

  const uploadCourseImage = useCallback(
    async (file) => {
      const formData = new FormData();
      formData.append("file", file);

      return toJson(
        await authedFetch(`${BASE}/upload`, {
          method: "POST",
          body: formData,
        }),
      );
    },
    [authedFetch],
  );

  return {
    listCourses,
    getCourseById,
    getCourseCurriculum,
    createCourse,
    updateCourse,
    deleteCourse,
    uploadCourseImage,
  };
}
