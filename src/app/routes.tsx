import type { AppRoute } from "./types";
import { CreateProjectPage } from "../features/projects/routes/CreateProjectPage";
import { ImportProjectPage } from "../features/projects/routes/ImportProjectPage";
import { ProjectsPage } from "../features/projects/routes/ProjectsPage";
import { ProjectHomePage } from "../features/project-home/routes/ProjectHomePage";
import { WorkspacePage } from "../features/workspace/routes/WorkspacePage";
import { VersionsPage } from "../features/versions/routes/VersionsPage";
import { VersionDetailPage } from "../features/versions/routes/VersionDetailPage";
import { ChangeRequestsPage } from "../features/change-requests/routes/ChangeRequestsPage";
import { ChangeRequestDetailPage } from "../features/change-requests/routes/ChangeRequestDetailPage";
import { SettingsPage } from "../features/settings/routes/SettingsPage";
import { SaveVersionModal } from "../features/actions/save-version/SaveVersionModal";
import { PublishChangesModal } from "../features/actions/publish/PublishChangesModal";
import { UpdateBlockedModal } from "../features/actions/update-project/UpdateBlockedModal";
import { ConflictResolutionModal } from "../features/actions/conflicts/ConflictResolutionModal";

export const appRoutes: AppRoute[] = [
  { path: "/projects", component: ProjectsPage, shell: "app" },
  { path: "/projects/new", component: CreateProjectPage, shell: "app" },
  { path: "/projects/import", component: ImportProjectPage, shell: "app" },
  { path: "/projects/:projectId/home", component: ProjectHomePage, shell: "project" },
  { path: "/projects/:projectId/workspace", component: WorkspacePage, shell: "project" },
  { path: "/projects/:projectId/versions", component: VersionsPage, shell: "project" },
  { path: "/projects/:projectId/versions/:versionId", component: VersionDetailPage, shell: "project" },
  {
    path: "/projects/:projectId/change-requests",
    component: ChangeRequestsPage,
    shell: "project"
  },
  {
    path: "/projects/:projectId/change-requests/:changeRequestId",
    component: ChangeRequestDetailPage,
    shell: "project"
  },
  { path: "/projects/:projectId/settings", component: SettingsPage, shell: "project" },
  { path: "/projects/:projectId/save-version", component: SaveVersionModal, shell: "project", modal: true },
  { path: "/projects/:projectId/publish", component: PublishChangesModal, shell: "project", modal: true },
  {
    path: "/projects/:projectId/update-blocked",
    component: UpdateBlockedModal,
    shell: "project",
    modal: true
  },
  {
    path: "/projects/:projectId/conflicts",
    component: ConflictResolutionModal,
    shell: "project",
    modal: true
  }
];
