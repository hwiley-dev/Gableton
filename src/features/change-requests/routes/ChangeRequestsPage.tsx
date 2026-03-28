import { useEffect, useState } from "react";
import { useAppRouter } from "../../../app/router";
import { useApiClient } from "../../../services/api/provider";
import type { ChangeRequestRecord } from "../../../services/api/types";
import { useProjectStateMachine } from "../../../state/project-machine/provider";
import { PageScaffold } from "../../shared/PageScaffold";
import { SectionCard } from "../../shared/SectionCard";

function summarizeReviewState(record: ChangeRequestRecord): string {
  if (record.status === "merged") {
    return "Merged to Main";
  }
  if (record.status === "closed") {
    return "Closed";
  }
  if (record.approvals > 0) {
    return `${record.approvals} approval${record.approvals === 1 ? "" : "s"} collected`;
  }
  return "Awaiting review";
}

export function ChangeRequestsPage() {
  const { contentMatch, navigate } = useAppRouter();
  const projectId = contentMatch.params.projectId;
  const apiClient = useApiClient();
  const { state } = useProjectStateMachine();
  const [changeRequests, setChangeRequests] = useState<ChangeRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!projectId) {
      return undefined;
    }

    let cancelled = false;

    const loadChangeRequests = async () => {
      setLoading(true);
      setError(undefined);

      try {
        const nextChangeRequests = await apiClient.listChangeRequests(projectId);
        if (!cancelled) {
          setChangeRequests(nextChangeRequests);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Loading change requests failed."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadChangeRequests();

    return () => {
      cancelled = true;
    };
  }, [apiClient, projectId, reloadTick, state.context.activeChangeRequestId]);

  return (
    <PageScaffold
      title="Change Requests"
      actions={
        <div className="page-actions">
          <button onClick={() => setReloadTick((value) => value + 1)}>Refresh</button>
        </div>
      }
    >
      {loading ? (
        <SectionCard title="Loading change requests">
          <p>Fetching review activity for this project.</p>
        </SectionCard>
      ) : null}
      {error ? (
        <SectionCard title="Change requests unavailable">
          <p>{error}</p>
        </SectionCard>
      ) : null}
      {!loading && !error && changeRequests.length === 0 ? (
        <SectionCard title="No change requests">
          <p>Publish a saved version to open the first review request.</p>
        </SectionCard>
      ) : null}
      {!loading && !error
        ? changeRequests.map((record) => (
            <SectionCard key={record.id} title={record.title}>
              <p>Author: {record.author}</p>
              <p>Status: {record.status}</p>
              <p>{summarizeReviewState(record)}</p>
              <button
                onClick={() =>
                  navigate(`/projects/${projectId}/change-requests/${record.id}`)
                }
              >
                View details
              </button>
            </SectionCard>
          ))
        : null}
    </PageScaffold>
  );
}
