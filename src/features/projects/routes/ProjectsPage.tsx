import { useAppRouter } from "../../../app/router";
import { PageScaffold } from "../../shared/PageScaffold";
import { SectionCard } from "../../shared/SectionCard";

export function ProjectsPage() {
  const { navigate } = useAppRouter();

  return (
    <PageScaffold title="Projects" actions={<button onClick={() => navigate("/projects/new")}>Create project</button>}>
      <SectionCard title="Neon Horizon">
        <p>Owner | Last activity 2h ago | Update available | 2 change requests</p>
        <button onClick={() => navigate("/projects/project_neon_horizon/home")}>Open project</button>
      </SectionCard>
      <SectionCard title="Tape Bloom">
        <p>Contributor | Up to date | 0 change requests</p>
        <button onClick={() => navigate("/projects/project_tape_bloom/home")}>Open project</button>
      </SectionCard>
    </PageScaffold>
  );
}
