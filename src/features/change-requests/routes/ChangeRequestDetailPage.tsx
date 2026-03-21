import { useEffect, useState } from "react";
import { useAppRouter } from "../../../app/router";
import { useApiClient } from "../../../services/api/provider";
import type { ChangeRequestRecord } from "../../../services/api/types";
import { PageScaffold } from "../../shared/PageScaffold";
import { SectionCard } from "../../shared/SectionCard";

export function ChangeRequestDetailPage() {
  const { contentMatch, navigate } = useAppRouter();
  const projectId = contentMatch.params.projectId;
  const changeRequestId = contentMatch.params.changeRequestId;
  const apiClient = useApiClient();
  const [changeRequest, setChangeRequest] = useState<ChangeRequestRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!projectId || !changeRequestId) {
      return undefined;
    }

    let cancelled = false;

    const loadChangeRequest = async () => {
      setLoading(true);
      setError(undefined);

      try {
        const requests = await apiClient.listChangeRequests(projectId);
        const matchedRequest = requests.find((item) => item.id === changeRequestId) ?? null;
        if (!cancelled) {
          if (!matchedRequest) {
            setError("The selected change request was not found.");
            setChangeRequest(null);
          } else {
            setChangeRequest(matchedRequest);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Loading the change request failed."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadChangeRequest();

    return () => {
      cancelled = true;
    };
  }, [apiClient, projectId, changeRequestId]);

  return (
    <PageScaffold
      title={changeRequest ? changeRequest.title : "Change Request Detail"}
      actions={
        <button onClick={() => navigate(`/projects/${projectId}/change-requests`)}>
          Back to change requests
        </button>
      }
    >
      {loading ? (
        <SectionCard title="Loading change request">
          <p>Fetching review metadata.</p>
        </SectionCard>
      ) : null}
      {error ? (
        <SectionCard title="Change request unavailable">
          <p>{error}</p>
        </SectionCard>
      ) : null}
      {changeRequest ? (
        <>
          <SectionCard title="Change summary">
            <p>Status: {changeRequest.status}</p>
            <p>Author: {changeRequest.author}</p>
            <p>Approvals: {changeRequest.approvals}</p>
            <p>Change request ID: {changeRequest.id}</p>
          </SectionCard>
          <SectionCard title="Merge readiness">
            <p>Approvals required: {Math.max(1 - changeRequest.approvals, 0)}</p>
            <p>Main moved: Unknown in Phase 1 route data</p>
            <p>Conflicts: Not yet surfaced on this detail route</p>
          </SectionCard>
          <SectionCard title="Review thread">
            <p>Review comments are not exposed by the Phase 1 API yet.</p>
          </SectionCard>
        </>
      ) : null}
    </PageScaffold>
  );
}
