import type { PropsWithChildren, ReactNode } from "react";

interface PageScaffoldProps extends PropsWithChildren {
  title: string;
  actions?: ReactNode;
}

export function PageScaffold({ title, actions, children }: PageScaffoldProps) {
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>{title}</h1>
        {actions}
      </header>
      <div style={{ display: "grid", gap: 16 }}>{children}</div>
    </div>
  );
}
