import { useCallback } from "react";
import { LMS_BASE_URL, toJson, useAuthedFetch } from "./authFetch";

const BASE = `${LMS_BASE_URL}/lessons`;

export function useLessonApi() {
  const authedFetch = useAuthedFetch();

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

  const fetchYouTubeTranscript = useCallback(
    async (videoUrl) =>
      toJson(
        await authedFetch(`${BASE}/youtube-transcript`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ videoUrl }),
        }),
      ),
    [authedFetch],
  );

  const getLessonResources = useCallback(
    async (lessonId) =>
      toJson(await authedFetch(`${BASE}/${lessonId}/resources`)),
    [authedFetch],
  );

  const uploadLessonResources = useCallback(
    async (lessonId, files) => {
      const formData = new FormData();
      Array.from(files || []).forEach((file) => {
        formData.append("files", file);
      });

      return toJson(
        await authedFetch(`${BASE}/${lessonId}/resources`, {
          method: "POST",
          body: formData,
        }),
      );
    },
    [authedFetch],
  );

  const deleteLessonResource = useCallback(
    async (lessonId, resourceId) =>
      toJson(
        await authedFetch(`${BASE}/${lessonId}/resources/${resourceId}`, {
          method: "DELETE",
        }),
      ),
    [authedFetch],
  );

  return {
    createLesson,
    updateLesson,
    deleteLesson,
    fetchYouTubeTranscript,
    getLessonResources,
    uploadLessonResources,
    deleteLessonResource,
  };
}
