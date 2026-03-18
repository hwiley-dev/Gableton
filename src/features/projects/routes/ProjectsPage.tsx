import { PageScaffold } from "../../shared/PageScaffold";
import { SectionCard } from "../../shared/SectionCard";

export function ProjectsPage() {
  return (
    <PageScaffold title="Projects" actions={<button>Create project</button>}>
      <SectionCard title="Neon Horizon">
        <p>Owner | Last activity 2h ago | Update available | 2 change requests</p>
        <button>Open project</button>
      </SectionCard>
      <SectionCard title="Tape Bloom">
        <p>Contributor | Up to date | 0 change requests</p>
        <button>Open project</button>
      </SectionCard>
    </PageScaffold>
  );
}
