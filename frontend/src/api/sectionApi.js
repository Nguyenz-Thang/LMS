import { useCallback } from "react";
import { LMS_BASE_URL, toJson, useAuthedFetch } from "./authFetch";

const BASE = `${LMS_BASE_URL}/sections`;

export function useSectionApi() {
  const authedFetch = useAuthedFetch();

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

  return {
    createSection,
    updateSection,
    deleteSection,
  };
}
