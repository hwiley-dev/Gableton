import { PageScaffold } from "../../shared/PageScaffold";
import { SectionCard } from "../../shared/SectionCard";

export function ImportProjectPage() {
  return (
    <PageScaffold title="Import Project">
      <SectionCard title="Import source">
        <p>Select an existing Ableton or GitDaw-style project folder.</p>
      </SectionCard>
      <SectionCard title="Readiness">
        <p>Show import plan, history size, and migration warnings before execution.</p>
      </SectionCard>
    </PageScaffold>
  );
}
