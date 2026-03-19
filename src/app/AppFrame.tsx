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
      style={{
        display: "grid",
        gridTemplateColumns: hasContextPanel ? "240px 1fr 320px" : "240px 1fr",
        minHeight: "100vh",
        position: "relative"
      }}
    >
      <aside style={{ borderRight: "1px solid #d7d7d7", padding: 16 }}>{leftNav}</aside>
      <main style={{ display: "flex", flexDirection: "column" }}>
        {topBar ? <header style={{ borderBottom: "1px solid #d7d7d7", padding: 16 }}>{topBar}</header> : null}
        <section style={{ flex: 1, padding: 24 }}>{children}</section>
      </main>
      {hasContextPanel ? (
        <aside style={{ borderLeft: "1px solid #d7d7d7", padding: 16 }}>{contextPanel}</aside>
      ) : null}
      {modalHost}
    </div>
  );
}
