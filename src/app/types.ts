import type { ComponentType } from "react";

export type AppShellMode = "app" | "project";
export type ContextPanelMode =
  | "none"
  | "warning_detail"
  | "version_detail"
  | "change_request_summary"
  | "environment_detail";

export interface AppRoute {
  path: string;
  component: ComponentType;
  shell: AppShellMode;
  modal?: boolean;
}
