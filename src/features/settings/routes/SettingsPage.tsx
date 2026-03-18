import { PageScaffold } from "../../shared/PageScaffold";
import { SectionCard } from "../../shared/SectionCard";

export function SettingsPage() {
  return (
    <PageScaffold title="Settings">
      <SectionCard title="Members and roles">
        <p>Maya - Owner</p>
        <p>Devin - Contributor</p>
      </SectionCard>
      <SectionCard title="Branch protection">
        <p>Protect Main: Enabled | Required approvals: 1</p>
      </SectionCard>
      <SectionCard title="Workspace preferences">
        <p>Cache size: 50 GB | Ableton detection: Automatic</p>
      </SectionCard>
    </PageScaffold>
  );
}
