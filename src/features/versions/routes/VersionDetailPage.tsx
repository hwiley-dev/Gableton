import { PageScaffold } from "../../shared/PageScaffold";
import { SectionCard } from "../../shared/SectionCard";

export function VersionDetailPage() {
  return (
    <PageScaffold title="Version Detail">
      <SectionCard title="Summary">
        <p>Tracks changed: 1 | Audio files added: 0 | Automation changed: Yes</p>
      </SectionCard>
      <SectionCard title="Environment snapshot">
        <p>Ableton 11.2.11 | 1 plugin warning</p>
      </SectionCard>
    </PageScaffold>
  );
}
