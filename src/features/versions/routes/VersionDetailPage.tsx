import { useEffect, useState } from "react";
import { useAppRouter } from "../../../app/router";
import { useApiClient } from "../../../services/api/provider";
import type { VersionRecord } from "../../../services/api/types";
import { PageScaffold } from "../../shared/PageScaffold";
import { SectionCard } from "../../shared/SectionCard";

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export function VersionDetailPage() {
  const { contentMatch, navigate } = useAppRouter();
  const projectId = contentMatch.params.projectId;
  const versionId = contentMatch.params.versionId;
  const apiClient = useApiClient();
  const [version, setVersion] = useState<VersionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!projectId || !versionId) {
      return undefined;
    }

    let cancelled = false;

    const loadVersion = async () => {
      setLoading(true);
      setError(undefined);

      try {
        const versions = await apiClient.listVersions(projectId);
        const matchedVersion = versions.find((item) => item.id === versionId) ?? null;
        if (!cancelled) {
          if (!matchedVersion) {
            setError("The selected version was not found.");
            setVersion(null);
          } else {
            setVersion(matchedVersion);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Loading the version failed."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadVersion();

    return () => {
      cancelled = true;
    };
  }, [apiClient, projectId, versionId]);

  return (
    <PageScaffold
      title={version ? version.title : "Version Detail"}
      actions={<button onClick={() => navigate(`/projects/${projectId}/versions`)}>Back to versions</button>}
    >
      {loading ? (
        <SectionCard title="Loading version">
          <p>Fetching version metadata.</p>
        </SectionCard>
      ) : null}
      {error ? (
        <SectionCard title="Version unavailable">
          <p>{error}</p>
        </SectionCard>
      ) : null}
      {version ? (
        <>
          <SectionCard title="Summary">
            <p>{version.summary}</p>
          </SectionCard>
          <SectionCard title="Metadata">
            <p>Author: {version.author}</p>
            <p>Created: {formatDateTime(version.createdAt)}</p>
            <p>State: {version.state}</p>
            <p>Version ID: {version.id}</p>
          </SectionCard>
          <SectionCard title="Environment snapshot">
            <p>Ableton environment snapshots are not exposed by the Phase 1 API yet.</p>
          </SectionCard>
        </>
      ) : null}
    </PageScaffold>
  );
}
