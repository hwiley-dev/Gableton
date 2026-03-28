import type { PropsWithChildren, ReactNode } from "react";

interface AppFrameProps extends PropsWithChildren {
  leftNav: ReactNode;
  topBar?: ReactNode;
  contextPanel?: ReactNode;
  modalHost?: ReactNode;
}

export function AppFrame({ leftNav, topBar, contextPanel, modalHost, children }: AppFrameProps) {
  const hasContextPanel = Boolean(contextPanel);

  return (
    <div
      className="app-frame"
      style={{ gridTemplateColumns: hasContextPanel ? "260px 1fr 320px" : "260px 1fr" }}
    >
      <aside className="app-frame__nav">{leftNav}</aside>
      <main className="app-frame__main">
        {topBar ? <header className="app-frame__header">{topBar}</header> : null}
        <section className="app-frame__content">{children}</section>
      </main>
      {hasContextPanel ? (
        <aside className="app-frame__context">{contextPanel}</aside>
      ) : null}
      {modalHost}
    </div>
  );
}
