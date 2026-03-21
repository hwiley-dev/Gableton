import { useEffect, useState } from "react";
import { useAppRouter } from "../../../app/router";
import { useApiClient } from "../../../services/api/provider";
import type { RepoRecord } from "../../../services/api/types";
import { PageScaffold } from "../../shared/PageScaffold";
import { SectionCard } from "../../shared/SectionCard";

interface ProjectOverview {
  repo: RepoRecord;
  versionCount: number;
  openChangeRequestCount: number;
  lastActivityAt?: string;
}

function formatDateTime(value?: string): string {
  if (!value) {
    return "No activity yet";
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export function ProjectsPage() {
  const { navigate } = useAppRouter();
  const apiClient = useApiClient();
  const [projects, setProjects] = useState<ProjectOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      setLoading(true);
      setError(undefined);

      try {
        const repos = await apiClient.listProjects();
        const overviews = await Promise.all(
          repos.map(async (repo) => {
            const [versions, changeRequests] = await Promise.all([
              apiClient.listVersions(repo.id),
              apiClient.listChangeRequests(repo.id)
            ]);

            return {
              repo,
              versionCount: versions.length,
              openChangeRequestCount: changeRequests.filter((item) => item.status === "open").length,
              lastActivityAt: versions[0]?.createdAt
            };
          })
        );

        if (!cancelled) {
          setProjects(overviews);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Loading projects failed."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, [apiClient, reloadTick]);

  return (
    <PageScaffold
      title="Projects"
      actions={
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate("/projects/new")}>Create project</button>
          <button onClick={() => setReloadTick((value) => value + 1)}>Refresh</button>
        </div>
      }
    >
      {loading ? (
        <SectionCard title="Loading projects">
          <p>Fetching available projects from the collaboration service.</p>
        </SectionCard>
      ) : null}
      {error ? (
        <SectionCard title="Projects unavailable">
          <p>{error}</p>
        </SectionCard>
      ) : null}
      {!loading && !error && projects.length === 0 ? (
        <SectionCard title="No projects yet">
          <p>Create or import a project to start collaborating.</p>
        </SectionCard>
      ) : null}
      {!loading && !error
        ? projects.map((project) => (
            <SectionCard key={project.repo.id} title={project.repo.name}>
              <p>Default branch: {project.repo.defaultBranch}</p>
              <p>Versions: {project.versionCount}</p>
              <p>Open change requests: {project.openChangeRequestCount}</p>
              <p>Last activity: {formatDateTime(project.lastActivityAt)}</p>
              <button onClick={() => navigate(`/projects/${project.repo.id}/home`)}>
                Open project
              </button>
            </SectionCard>
          ))
        : null}
    </PageScaffold>
  );
}
