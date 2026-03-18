import { PageScaffold } from "../../shared/PageScaffold";
import { SectionCard } from "../../shared/SectionCard";

export function ChangeRequestDetailPage() {
  return (
    <PageScaffold title="Change Request Detail">
      <SectionCard title="Change summary">
        <p>Tracks added: 1 | Clips moved: 2 | Automation changed: Yes</p>
      </SectionCard>
      <SectionCard title="Merge readiness">
        <p>Approvals required: 1 | Main moved: No | Conflicts: None</p>
      </SectionCard>
      <SectionCard title="Review thread">
        <p>Please check the transition into the chorus.</p>
      </SectionCard>
    </PageScaffold>
  );
}
