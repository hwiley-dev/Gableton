# Gableton Desktop Route and Component Spec

**Date:** March 18, 2026  
**Status:** Draft  
**Audience:** Desktop client engineering, product, design

## 1. Purpose

Translate the product UX and core action state machine into an implementation-facing desktop app structure.

This spec defines:

- desktop route map
- app shell layout
- page-level component boundaries
- shared providers and state ownership
- data-loading responsibilities
- modal and side-panel structure

Related specs:

- [product-ux-spec.md](/Users/hunterwiley/Code-Projects/Gableton/docs/product-ux-spec.md)
- [core-action-state-machine.md](/Users/hunterwiley/Code-Projects/Gableton/docs/core-action-state-machine.md)
- [phase0-to-phase1-migration-spec.md](/Users/hunterwiley/Code-Projects/Gableton/docs/phase0-to-phase1-migration-spec.md)
- [phase1.yaml](/Users/hunterwiley/Code-Projects/Gableton/openapi/phase1.yaml)

## 2. Assumptions

1. The desktop app uses a route-driven shell even if packaged as a native desktop app.
2. One `ProjectStateMachine` instance exists per open project workspace.
3. Server data and local workspace data are separate concerns.
4. Native desktop capabilities such as file picker, folder reveal, Ableton process detection, and filesystem watching are provided via a platform bridge.

## 3. Architecture Overview

The desktop app should be split into four layers:

- `Route layer`: decides which screen is visible.
- `State layer`: owns project machine state, derived selectors, and view models.
- `Data layer`: API queries plus local native bridge queries.
- `Presentation layer`: components that render based on typed props and dispatch typed events.

The route layer must not own business logic for save, publish, or update. Those actions belong to the project machine and action services.

## 4. App Shell

## 4.1 Shell structure

Persistent shell for all authenticated app routes:

- `AppFrame`
- `LeftNavRail`
- `TopStatusBar`
- `MainContentOutlet`
- `RightContextPanel`
- `GlobalModalHost`
- `GlobalToastHost`

Interpretation:

- `LeftNavRail` handles app and project navigation.
- `TopStatusBar` is the persistent action/status strip for an opened project.
- `RightContextPanel` shows route-specific details such as warnings, approvals, or version metadata.
- `GlobalModalHost` renders modal flows such as `Save version`, `Create project`, or restore confirmations.

## 4.2 Shell behavior

When no project is open:

- render `AppFrame` without `TopStatusBar`
- `RightContextPanel` is collapsed

When a project is open:

- render `ProjectShell`
- mount `ProjectStateMachineProvider`
- mount project query providers and local workspace providers

## 5. Route Map

Recommended route map:

- `/projects`
- `/projects/new`
- `/projects/import`
- `/projects/:projectId`
- `/projects/:projectId/home`
- `/projects/:projectId/workspace`
- `/projects/:projectId/versions`
- `/projects/:projectId/versions/:versionId`
- `/projects/:projectId/change-requests`
- `/projects/:projectId/change-requests/:changeRequestId`
- `/projects/:projectId/settings`

Recommended modal routes:

- `/projects/:projectId/save-version`
- `/projects/:projectId/publish`
- `/projects/:projectId/restore/:versionId`
- `/projects/:projectId/update-blocked`
- `/projects/:projectId/conflicts`

Recommended redirect rules:

- `/projects/:projectId` -> `/projects/:projectId/home`
- invalid nested routes -> nearest valid project route with toast error

## 6. Shared Providers

These providers should be mounted once at app or project shell level.

### 6.1 App-scoped providers

- `AuthSessionProvider`
- `ApiClientProvider`
- `DesktopBridgeProvider`
- `NotificationProvider`
- `DialogProvider`

### 6.2 Project-scoped providers

- `ProjectStateMachineProvider`
- `ProjectQueryProvider`
- `WorkspaceWatchProvider`
- `EnvironmentDiagnosticsProvider`
- `ContextPanelProvider`

### 6.3 Ownership rules

- API cache owns remote repository data.
- Native bridge layer owns local filesystem snapshots and OS integration.
- `ProjectStateMachineProvider` owns action state and button enablement.
- Routes compose view models from providers; they do not calculate core action rules independently.

## 7. Shared View Models and Selectors

All project routes should consume selectors rather than raw machine state.

Required selectors:

- `selectHeadlineStatus`
- `selectStatusTone`
- `selectSaveVersionEnabled`
- `selectPublishEnabled`
- `selectUpdateEnabled`
- `selectSaveVersionBlockingReason`
- `selectPublishBlockingReason`
- `selectUpdateBlockingReason`
- `selectEnvironmentSummary`
- `selectWorkspaceSummary`
- `selectOpenChangeRequestSummary`

Required project commands:

- `openSaveVersionModal()`
- `confirmSaveVersion(payload)`
- `startPublish(payload)`
- `startUpdateProject()`
- `retryScan()`
- `openConflictResolution()`

## 8. Route Specifications

### 8.1 `/projects`

Purpose:

- project index

Primary data:

- current user projects
- role per project
- last activity
- open change request count

Primary components:

- `ProjectsPage`
- `ProjectsHeader`
- `ProjectList`
- `ProjectCard`
- `ProjectsEmptyState`

Primary actions:

- open project
- create project
- import project

API/local dependencies:

- `GET /v1/repos/:repoId` is not needed per card if project list endpoint exists later
- Phase 1 may use stubbed aggregated list service until list endpoint is formalized

### 8.2 `/projects/new`

Purpose:

- create project flow

Primary components:

- `CreateProjectWizard`
- `ProjectBasicsStep`
- `WorkspaceSelectionStep`
- `ProtectionPolicyStep`
- `InviteCollaboratorsStep`

Primary actions:

- choose folder
- create project

Dependencies:

- native folder picker
- `POST /v1/repos`
- `POST /v1/repos/:repoId/members`

### 8.3 `/projects/import`

Purpose:

- import an existing Ableton or GitDaw-style project into Gableton

Primary components:

- `ImportProjectPage`
- `ImportSourcePicker`
- `ImportReadinessPanel`
- `ImportPreviewSummary`
- `ImportExecutePanel`

Dependencies:

- local import CLI or embedded import service
- native folder picker

### 8.4 `Project shell routes`

All routes under `/projects/:projectId/*` should render inside:

- `ProjectShell`
- `ProjectTopStatusBar`
- `ProjectContentOutlet`
- `ProjectContextPanel`

Project shell responsibilities:

- boot project machine on entry
- subscribe to workspace watcher
- load core remote project metadata
- derive top-level action states

Project shell must remain mounted when moving between project child routes so scans and action state are not reset.

### 8.5 `/projects/:projectId/home`

Purpose:

- daily command center

Primary data:

- project metadata
- workspace summary
- latest approved version
- recent versions
- open change requests
- environment warnings

Primary components:

- `ProjectHomePage`
- `WorkspaceStatusCard`
- `LatestApprovedVersionCard`
- `RecentVersionsList`
- `OpenChangeRequestsCard`
- `EnvironmentWarningsCard`
- `PrimaryActionCluster`

Context panel content:

- selected warning detail
- selected change request summary

The home route is the default landing route and should contain the highest-value actions.

### 8.6 `/projects/:projectId/workspace`

Purpose:

- inspect local workspace state and diagnostics

Primary data:

- workspace path
- scan status
- local change summary
- environment diagnostics
- current line information

Primary components:

- `WorkspacePage`
- `WorkspacePathCard`
- `LocalChangeSummaryCard`
- `ScanProgressPanel`
- `EnvironmentDiagnosticsList`
- `WorkspaceActionsBar`

Context panel content:

- detailed changed items
- plugin or sample issue details

Dependencies:

- filesystem watcher snapshot
- local scan output
- environment diagnostics output

### 8.7 `/projects/:projectId/versions`

Purpose:

- browse local and shared version history

Primary data:

- version list
- author
- timestamps
- review state
- short summaries

Primary components:

- `VersionsPage`
- `VersionsToolbar`
- `VersionList`
- `VersionRow`
- `VersionFilters`

Context panel content:

- selected version details

### 8.8 `/projects/:projectId/versions/:versionId`

Purpose:

- dedicated version detail view

Primary components:

- `VersionDetailPage`
- `VersionHeader`
- `VersionSummaryPanel`
- `EnvironmentSnapshotPanel`
- `AdvancedMetadataPanel`
- `VersionActionsBar`

Primary actions:

- restore version
- create change request from version

Dependencies:

- local version metadata store
- remote version detail if already published

### 8.9 `/projects/:projectId/change-requests`

Purpose:

- list all change requests

Primary data:

- title
- author
- source line
- target line
- status
- approvals
- warnings

Primary components:

- `ChangeRequestsPage`
- `ChangeRequestsToolbar`
- `ChangeRequestList`
- `ChangeRequestRow`

Context panel content:

- selected request summary

### 8.10 `/projects/:projectId/change-requests/:changeRequestId`

Purpose:

- review and merge a single change request

Primary data:

- request metadata
- musical diff summary
- environment warnings
- approvals
- merge readiness

Primary components:

- `ChangeRequestDetailPage`
- `ChangeRequestHeader`
- `ChangeSummaryPanel`
- `MergeReadinessPanel`
- `ApprovalsPanel`
- `CommentsPanel`
- `ChangeRequestActionsBar`

Primary actions:

- approve
- request changes
- merge

Dependencies:

- `POST /v1/repos/:repoId/pull-requests/:pullRequestId/approve`
- `POST /v1/repos/:repoId/pull-requests/:pullRequestId/merge`

### 8.11 `/projects/:projectId/settings`

Purpose:

- project and workspace settings

Primary components:

- `SettingsPage`
- `MembersSettingsSection`
- `BranchProtectionSection`
- `WorkspacePreferencesSection`
- `CacheSettingsSection`

Dependencies:

- `POST /v1/repos/:repoId/members`
- project policy service
- local workspace preferences store

## 9. Top Status Bar Spec

`ProjectTopStatusBar` is shared across all project routes.

Required child components:

- `ProjectIdentityChip`
- `WorkspaceIdentityChip`
- `HeadlineStatusPill`
- `EnvironmentBadgeGroup`
- `PrimaryActionCluster`

`PrimaryActionCluster` contains:

- `SaveVersionButton`
- `PublishChangesButton`
- `UpdateProjectButton`

Rules:

- button enabled state must come only from selectors backed by the project state machine
- button tooltip text should surface the exact blocking reason
- buttons dispatch events, not direct network calls

## 10. Modal and Overlay Spec

Modal ownership rule:

- route components may request a modal
- `GlobalModalHost` renders it
- modal confirm/cancel dispatches machine events or route actions

Required modals:

- `SaveVersionModal`
- `PublishChangesModal`
- `RestoreVersionModal`
- `UpdateBlockedModal`
- `ConflictResolutionModal`
- `CreateProjectModal` if wizard is modalized later

### 10.1 `SaveVersionModal`

Inputs:

- generated diff summary
- environment warnings
- current scan revision

Outputs:

- `SAVE_CONFIRMED`
- `SAVE_CANCELLED`

### 10.2 `PublishChangesModal`

Inputs:

- saved version info
- line target options
- preflight warnings

Outputs:

- `PUBLISH_CLICKED`
- close without transition if cancelled

### 10.3 `UpdateBlockedModal`

Inputs:

- blocking reason
- recommended next action

Outputs:

- open save modal
- cancel

### 10.4 `ConflictResolutionModal`

Inputs:

- overlapping summary
- suggested next steps

Outputs:

- open in Ableton
- dismiss

## 11. Context Panel Spec

The right-side panel is route-driven and optional.

Allowed panel modes:

- `warning_detail`
- `version_detail`
- `change_request_summary`
- `environment_detail`
- `none`

Ownership rules:

- route decides default mode
- user selection changes current panel item
- panel content never owns core mutation logic

## 12. Component Boundaries

Use these boundaries consistently:

- `Page components`
  - route-bound, assemble data and layout
- `Section components`
  - reusable route sections such as cards, lists, panels
- `Action components`
  - buttons and forms that dispatch typed commands
- `Pure display components`
  - typography, pills, badges, summaries

Do not let section components call API endpoints directly. They should receive data and callbacks from page or provider layers.

## 13. Data Loading Responsibilities

### 13.1 Remote query responsibilities

Project child routes need a shared remote data layer for:

- repo metadata
- change requests
- approvals
- manifest-backed summaries
- member roles and project settings

Use remote fetches for:

- project boot metadata
- change request lists and details
- settings and members
- version publication state

### 13.2 Local query responsibilities

Use native bridge or local store for:

- workspace path
- filesystem scan status
- local version metadata
- environment diagnostics
- Ableton process detection
- cache and local preferences

### 13.3 Route preloading

Preload on project shell mount:

- project metadata
- initial workspace snapshot
- latest change request summary
- latest approved ref state

Preload on specific detail route entry:

- version detail
- change request detail

## 14. API and Native Bridge Mapping

### 14.1 Route-to-API mapping

Project boot:

- `GET /v1/repos/:repoId`

Publish flow:

- `POST /v1/repos/:repoId/objects/existence`
- `POST /v1/repos/:repoId/uploads/sign`
- `POST /v1/repos/:repoId/commits/stage`
- `POST /v1/repos/:repoId/commits/finalize`
- `POST /v1/repos/:repoId/refs/:refName/move`
- `POST /v1/repos/:repoId/pull-requests`

Change request review:

- `POST /v1/repos/:repoId/pull-requests/:pullRequestId/approve`
- `POST /v1/repos/:repoId/pull-requests/:pullRequestId/merge`

Update flow:

- `GET /v1/repos/:repoId/commits/:commitId/manifest`
- `POST /v1/repos/:repoId/downloads/sign`

Settings:

- `POST /v1/repos/:repoId/members`

### 14.2 Native bridge responsibilities

Required bridge methods:

- `pickFolder()`
- `revealInFinder(path)`
- `openAbletonProject(path)`
- `watchWorkspace(path)`
- `getWorkspaceSnapshot(projectId)`
- `getEnvironmentDiagnostics(projectId)`
- `startLocalScan(projectId)`
- `applyWorkspaceMutation(projectId, manifest)`
- `detectAbletonOpen(projectId)`

## 15. Suggested Module Layout

Suggested desktop client module layout:

- `src/app/AppFrame.tsx`
- `src/app/routes.tsx`
- `src/features/projects/routes/*`
- `src/features/project-shell/ProjectShell.tsx`
- `src/features/project-shell/ProjectTopStatusBar.tsx`
- `src/features/workspace/*`
- `src/features/versions/*`
- `src/features/change-requests/*`
- `src/features/settings/*`
- `src/features/actions/save-version/*`
- `src/features/actions/publish/*`
- `src/features/actions/update-project/*`
- `src/state/project-machine/*`
- `src/state/selectors/*`
- `src/services/api/*`
- `src/services/desktop-bridge/*`

## 16. Vertical Slice Recommendation

First implementation slice should cover:

1. `/projects`
2. `/projects/:projectId/home`
3. `ProjectTopStatusBar`
4. `SaveVersionModal`
5. publish preflight to change request creation

This is the thinnest slice that validates the core product promise without overbuilding navigation.

## 17. Acceptance Criteria

This route/component spec is acceptable when:

1. Every screen in the UX spec has a clear route or modal home.
2. Every primary action is owned by the shared project state machine, not by scattered screen logic.
3. Remote and local data responsibilities are separated cleanly.
4. A project child-route transition does not reset scan or action state.
5. The status bar and primary actions behave identically from every project child route.
