import { PageScaffold } from "../../shared/PageScaffold";
import { SectionCard } from "../../shared/SectionCard";

export function CreateProjectPage() {
  return (
    <PageScaffold title="Create Project">
      <SectionCard title="Basics">
        <p>Project name, workspace folder, and optional Ableton import.</p>
      </SectionCard>
      <SectionCard title="Protection">
        <p>Protect Main is enabled by default with required approvals.</p>
      </SectionCard>
      <SectionCard title="Collaborators">
        <p>Invite collaborators and assign roles.</p>
      </SectionCard>
    </PageScaffold>
  );
}
