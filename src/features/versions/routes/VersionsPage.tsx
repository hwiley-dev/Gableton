import { useEffect, useState } from "react";
import { useAppRouter } from "../../../app/router";
import { useApiClient } from "../../../services/api/provider";
import type { VersionRecord } from "../../../services/api/types";
import { useProjectStateMachine } from "../../../state/project-machine/provider";
import { PageScaffold } from "../../shared/PageScaffold";
import { SectionCard } from "../../shared/SectionCard";

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export function VersionsPage() {
  const { contentMatch, navigate } = useAppRouter();
  const projectId = contentMatch.params.projectId;
  const apiClient = useApiClient();
  const { state } = useProjectStateMachine();
  const [versions, setVersions] = useState<VersionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!projectId) {
      return undefined;
    }

    let cancelled = false;

    const loadVersions = async () => {
      setLoading(true);
      setError(undefined);

      try {
        const nextVersions = await apiClient.listVersions(projectId);
        if (!cancelled) {
          setVersions(nextVersions);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Loading versions failed.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadVersions();

    return () => {
      cancelled = true;
    };
  }, [apiClient, projectId, reloadTick, state.context.latestPublishedVersionId]);

  return (
    <PageScaffold
      title="Versions"
      actions={
        <div className="page-actions">
          <button onClick={() => setReloadTick((value) => value + 1)}>Refresh</button>
        </div>
      }
    >
      {loading ? (
        <SectionCard title="Loading versions">
          <p>Fetching remote version history for this project.</p>
        </SectionCard>
      ) : null}
      {error ? (
        <SectionCard title="Versions unavailable">
          <p>{error}</p>
        </SectionCard>
      ) : null}
      {!loading && !error && versions.length === 0 ? (
        <SectionCard title="No published versions">
          <p>Publish the first reviewed change to create remote version history.</p>
        </SectionCard>
      ) : null}
      {!loading && !error
        ? versions.map((version) => (
            <SectionCard key={version.id} title={version.title}>
              <p>Author: {version.author}</p>
              <p>Created: {formatDateTime(version.createdAt)}</p>
              <p>State: {version.state}</p>
              <p>{version.summary}</p>
              <button onClick={() => navigate(`/projects/${projectId}/versions/${version.id}`)}>
                View details
              </button>
            </SectionCard>
          ))
        : null}
    </PageScaffold>
  );
}
