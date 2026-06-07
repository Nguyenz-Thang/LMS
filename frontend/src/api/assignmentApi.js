import { useCallback } from "react";
import { LMS_BASE_URL, toJson, useAuthedFetch } from "./authFetch";

const BASE = `${LMS_BASE_URL}/assignments`;

export function useAssignmentApi() {
  const authedFetch = useAuthedFetch();

  const listSubmissions = useCallback(
    async (assignmentId) =>
      toJson(await authedFetch(`${BASE}/${assignmentId}/submissions`)),
    [authedFetch],
  );

  const listAssignmentSummaries = useCallback(
    async () => toJson(await authedFetch(`${BASE}/summary`)),
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
    listAssignmentSummaries,
    listSubmissions,
    gradeSubmission,
  };
}
