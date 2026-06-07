import { useCallback } from "react";
import api from "./axios";
import { LMS_BASE_URL, toJson, useAuthedFetch } from "./authFetch";

export { LMS_BASE_URL };
const BASE = `${LMS_BASE_URL}/courses`;

export async function getCourses(params = {}) {
  const res = await api.get("/courses", { params });
  return res?.data;
}

export function useCourseApi() {
  const authedFetch = useAuthedFetch({ logoutOnForbidden: false });

  const listCourses = useCallback(
    async ({
      keyword = "",
      manageOnly = false,
      status = "",
      page = 0,
      size = 6,
    } = {}) => {
      const searchParams = new URLSearchParams();

      if (keyword?.trim()) searchParams.set("keyword", keyword.trim());
      if (manageOnly) searchParams.set("manageOnly", "true");
      if (status?.trim()) searchParams.set("status", status.trim());
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

  const approveCourse = useCallback(
    async (courseId) =>
      toJson(
        await authedFetch(`${BASE}/${courseId}/approve`, {
          method: "POST",
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
    approveCourse,
    uploadCourseImage,
  };
}
