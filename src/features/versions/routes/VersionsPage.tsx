import { PageScaffold } from "../../shared/PageScaffold";
import { SectionCard } from "../../shared/SectionCard";

export function VersionsPage() {
  return (
    <PageScaffold title="Versions">
      <SectionCard title="Version list">
        <p>Bass automation pass | Maya | Saved locally | 1 track changed</p>
        <p>Replace kick samples | Devin | Merged to Main | 3 audio files replaced</p>
      </SectionCard>
    </PageScaffold>
  );
}
