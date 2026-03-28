import { useEffect, useState } from "react";
import { useAppRouter } from "../../../app/router";
import { useApiClient } from "../../../services/api/provider";
import type { ChangeRequestRecord, VersionRecord } from "../../../services/api/types";
import { PageScaffold } from "../../shared/PageScaffold";
import { SectionCard } from "../../shared/SectionCard";
import { useProjectStateMachine } from "../../../state/project-machine/provider";
import { selectWorkspaceSummary } from "../../../state/selectors/projectSelectors";

function formatDateTime(value?: string): string {
  if (!value) {
    return "No remote activity yet";
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export function ProjectHomePage() {
  const { state } = useProjectStateMachine();
  const { contentMatch, navigate } = useAppRouter();
  const projectId = contentMatch.params.projectId;
  const apiClient = useApiClient();
  const workspaceSummary = selectWorkspaceSummary(state);
  const [latestVersion, setLatestVersion] = useState<VersionRecord | null>(null);
  const [openRequest, setOpenRequest] = useState<ChangeRequestRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!projectId) {
      return undefined;
    }

    let cancelled = false;

    const loadRemoteSummary = async () => {
      setLoading(true);
      setError(undefined);

      try {
        const [versions, requests] = await Promise.all([
          apiClient.listVersions(projectId),
          apiClient.listChangeRequests(projectId)
        ]);

        if (!cancelled) {
          setLatestVersion(versions[0] ?? null);
          setOpenRequest(requests.find((item) => item.status === "open") ?? null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Loading project summary failed."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadRemoteSummary();

    return () => {
      cancelled = true;
    };
  }, [
    apiClient,
    projectId,
    state.context.activeChangeRequestId,
    state.context.latestPublishedVersionId
  ]);

  return (
    <PageScaffold
      title="Project Home"
      actions={
        <div className="page-actions">
          <button onClick={() => navigate(`/projects/${projectId}/versions`)}>
            View versions
          </button>
          <button onClick={() => navigate(`/projects/${projectId}/change-requests`)}>
            View change requests
          </button>
        </div>
      }
    >
      <SectionCard title="Workspace status">
        <ul>
          {workspaceSummary.map((item) => (
            <li key={item}>{item}</li>
          ))}
          <li>Workspace path: {state.context.workspacePath}</li>
          <li>Last scanned: {state.context.workspaceInventory.lastScannedAt ?? "Not scanned yet"}</li>
        </ul>
      </SectionCard>
      <SectionCard title="Latest approved version">
        {loading ? <p>Loading remote version history.</p> : null}
        {error ? <p>{error}</p> : null}
        {!loading && !error && latestVersion ? (
          <>
            <p>{latestVersion.title}</p>
            <p>
              {latestVersion.author} | {formatDateTime(latestVersion.createdAt)}
            </p>
          </>
        ) : null}
        {!loading && !error && !latestVersion ? <p>No published versions yet.</p> : null}
      </SectionCard>
      <SectionCard title="Open change requests">
        {loading ? <p>Loading review activity.</p> : null}
        {error ? <p>{error}</p> : null}
        {!loading && !error ? (
          <p>{openRequest?.title ?? state.context.openChangeRequest?.title ?? "No open change requests."}</p>
        ) : null}
      </SectionCard>
    </PageScaffold>
  );
}
