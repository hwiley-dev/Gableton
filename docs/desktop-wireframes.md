# Gableton Desktop Wireframes

**Date:** March 18, 2026  
**Status:** Low-fidelity  
**Audience:** Product, design, desktop client engineering

## 1. Purpose

Provide low-fidelity wireframes for the Phase 1 desktop app so route and component scaffolding can follow a concrete screen model.

These are structural wireframes, not visual design comps.

Related specs:

- [product-ux-spec.md](/Users/hunterwiley/Code-Projects/Gableton/docs/product-ux-spec.md)
- [core-action-state-machine.md](/Users/hunterwiley/Code-Projects/Gableton/docs/core-action-state-machine.md)
- [desktop-route-component-spec.md](/Users/hunterwiley/Code-Projects/Gableton/docs/desktop-route-component-spec.md)

## 2. App Shell

```text
+--------------------------------------------------------------------------------------+
| Left Nav         | Project / Workspace / Status                    | Context Panel   |
|------------------+-------------------------------------------------+-----------------|
| Projects         | Project: Neon Horizon                           | Warning Detail  |
| Home             | Workspace: Studio MacBook                       | or Version      |
| Workspace        | Status: Update available                        | or CR Summary   |
| Versions         | [Save version] [Publish changes] [Update project]                 |
| Change Requests  +-------------------------------------------------+-----------------|
| Settings         | Main Content Outlet                                                |
|                  |                                                                 |
|                  |                                                                 |
|                  |                                                                 |
+--------------------------------------------------------------------------------------+
```

Rules:

- `Left Nav` persists for authenticated routes.
- `Status` bar appears only when a project is open.
- `Context Panel` is collapsible and route-driven.

## 3. Projects Screen

Route:

- `/projects`

```text
+--------------------------------------------------------------------------------------+
| Projects                                                                      [+ New] |
|--------------------------------------------------------------------------------------|
| Search ____________________                                                       |
|--------------------------------------------------------------------------------------|
| [Project Card] Neon Horizon                                                     |
| Owner | Last activity 2h ago | Update available | 2 change requests             |
| [Open project]                                                                  |
|--------------------------------------------------------------------------------------|
| [Project Card] Tape Bloom                                                       |
| Contributor | Up to date | 0 change requests                                    |
| [Open project]                                                                  |
+--------------------------------------------------------------------------------------+
```

Empty state:

```text
+--------------------------------------------------------------+
| No projects yet                                              |
| Create a new project or import an Ableton folder to begin.   |
| [Create project]  [Import project]                           |
+--------------------------------------------------------------+
```

## 4. Create Project Flow

Route:

- `/projects/new`

```text
+--------------------------------------------------------------------------------------+
| Create Project                                                                        |
|--------------------------------------------------------------------------------------|
| Step 1: Basics                                                                        |
| Project name: _______________________                                                 |
| Workspace folder: [/Users/.../Ableton Project      ] [Choose folder]                 |
| [ ] Import existing Ableton project                                                   |
|--------------------------------------------------------------------------------------|
| Step 2: Protection                                                                    |
| [x] Protect Main                                                                      |
| Required approvals: [1 v]                                                             |
|--------------------------------------------------------------------------------------|
| Step 3: Collaborators                                                                 |
| Invite by email or username                                                           |
| ________________________________ [Add]                                                |
|--------------------------------------------------------------------------------------|
| [Cancel]                                                    [Create project]          |
+--------------------------------------------------------------------------------------+
```

## 5. Project Home

Route:

- `/projects/:projectId/home`

```text
+--------------------------------------------------------------------------------------+
| Project: Neon Horizon | Workspace: Studio MacBook | Status: Changes not saved        |
| [Save version] [Publish changes] [Update project]                                    |
|--------------------------------------------------------------------------------------|
| Workspace Status        | Latest Approved Version    | Environment Warnings           |
|-------------------------+----------------------------+--------------------------------|
| Local changes: 3 tracks | "Tighten chorus drums"    | 1 plugin missing               |
| Samples missing: 0      | by Maya, 2h ago           | Ableton version mismatch       |
| [Open in Ableton]       | [Restore version]         | [Review diagnostics]           |
|--------------------------------------------------------------------------------------|
| Recent Versions                                 | Open Change Requests              |
|-------------------------------------------------+----------------------------------|
| "Bass automation pass"                          | "Add bridge synth textures"      |
| "Replace kick samples"                          | Waiting for review               |
| "Session cleanup"                               | [Open]                           |
+--------------------------------------------------------------------------------------+
```

## 6. Workspace Screen

Route:

- `/projects/:projectId/workspace`

```text
+--------------------------------------------------------------------------------------+
| Workspace                                                                             |
|--------------------------------------------------------------------------------------|
| Path: /Users/.../Neon Horizon                                                         |
| Scan: Idle                                                                            |
| Current line: Main                                                                    |
|--------------------------------------------------------------------------------------|
| Local Change Summary                  | Environment Diagnostics                      |
|--------------------------------------+-----------------------------------------------|
| Tracks changed: 3                    | Missing plugins: 1                           |
| Audio files added: 2                 | Missing samples: 0                           |
| Automation changed: Yes              | Ableton version: 11.2.11                     |
| [Reveal changed items]               | [Review plugin list]                         |
|--------------------------------------------------------------------------------------|
| [Open in Ableton] [Save version] [Discard local scan state]                          |
+--------------------------------------------------------------------------------------+
```

## 7. Versions Screen

Route:

- `/projects/:projectId/versions`

```text
+--------------------------------------------------------------------------------------+
| Versions                                                           [Filter] [Search] |
|--------------------------------------------------------------------------------------|
| Title                     | Author | Time       | State            | Summary          |
|--------------------------------------------------------------------------------------|
| Bass automation pass      | Maya   | 12m ago    | Saved locally    | 1 track changed  |
| Replace kick samples      | Devin  | 2h ago     | Merged to Main   | 3 audio replaced |
| Session cleanup           | Maya   | Yesterday   | Change request   | routing cleanup  |
+--------------------------------------------------------------------------------------+
| Right Context Panel: selected version summary, environment snapshot, actions         |
+--------------------------------------------------------------------------------------+
```

## 8. Change Request Detail

Route:

- `/projects/:projectId/change-requests/:changeRequestId`

```text
+--------------------------------------------------------------------------------------+
| Change Request: Add bridge synth textures                                            |
| Author: Maya | Source: maya/bridge-pass | Target: Main | Status: Awaiting review     |
|--------------------------------------------------------------------------------------|
| Change Summary                           | Merge Readiness                            |
|------------------------------------------+--------------------------------------------|
| Tracks added: 1                          | Approvals required: 1                      |
| Clips moved: 2                           | Main moved: No                             |
| Automation changed: Yes                  | Conflicts: None                            |
| Audio assets added: 1                    | Environment warnings: 1                    |
|--------------------------------------------------------------------------------------|
| Comments / Review Thread                                                            |
| - "Please check the transition into the chorus."                                    |
|--------------------------------------------------------------------------------------|
| [Approve] [Request changes] [Merge to Main]                                         |
+--------------------------------------------------------------------------------------+
```

## 9. Save Version Modal

Modal route:

- `/projects/:projectId/save-version`

```text
+--------------------------------------------------------------+
| Save version                                                 |
|--------------------------------------------------------------|
| Message                                                      |
| _____________________________________________                |
| Notes (optional)                                             |
| _____________________________________________                |
|--------------------------------------------------------------|
| Summary                                                      |
| - Tracks changed: 3                                          |
| - Audio files added: 2                                       |
| - Automation changed                                         |
|--------------------------------------------------------------|
| Warnings                                                     |
| - 1 plugin missing on this machine                           |
|--------------------------------------------------------------|
| [Cancel]                                  [Save version]     |
+--------------------------------------------------------------+
```

Blocking variant:

```text
+--------------------------------------------------------------+
| Save version                                                 |
|--------------------------------------------------------------|
| Workspace scan still in progress                             |
| Wait for the current scan to finish before saving.           |
|--------------------------------------------------------------|
| [Close]                                                      |
+--------------------------------------------------------------+
```

## 10. Publish Changes Modal

Modal route:

- `/projects/:projectId/publish`

```text
+--------------------------------------------------------------+
| Publish changes                                              |
|--------------------------------------------------------------|
| Target line: [Main v]                                        |
| Title: ________________________________________              |
| Description: __________________________________              |
|--------------------------------------------------------------|
| Preflight summary                                            |
| - Saved version found                                        |
| - Base commit known                                          |
| - Main has moved: No                                         |
|--------------------------------------------------------------|
| Warnings                                                     |
| - 1 plugin missing on this machine                           |
|--------------------------------------------------------------|
| [Cancel]                              [Publish changes]      |
+--------------------------------------------------------------+
```

Conflict-blocked variant:

```text
+--------------------------------------------------------------+
| Publish blocked                                              |
|--------------------------------------------------------------|
| Your changes overlap with newer work on Main.                |
| Resolve the conflict in Ableton and save a new version.      |
|--------------------------------------------------------------|
| [Open conflict details]                  [Close]             |
+--------------------------------------------------------------+
```

## 11. Update Blocked Modal

Modal route:

- `/projects/:projectId/update-blocked`

```text
+--------------------------------------------------------------+
| Update blocked                                               |
|--------------------------------------------------------------|
| You have local changes that are not saved yet.               |
| Save a version before updating this workspace.               |
|--------------------------------------------------------------|
| [Cancel]                           [Save version first]      |
+--------------------------------------------------------------+
```

## 12. Conflict Resolution Modal

Modal route:

- `/projects/:projectId/conflicts`

```text
+--------------------------------------------------------------+
| Conflict requires attention                                  |
|--------------------------------------------------------------|
| Overlap detected in:                                         |
| - Track 5 automation                                         |
| - Chorus arrangement region                                  |
|--------------------------------------------------------------|
| Recommended next step                                        |
| Open the project in Ableton, resolve manually, then save     |
| a new version and publish again.                             |
|--------------------------------------------------------------|
| [Dismiss]                            [Open in Ableton]       |
+--------------------------------------------------------------+
```

## 13. Settings Screen

Route:

- `/projects/:projectId/settings`

```text
+--------------------------------------------------------------------------------------+
| Settings                                                                              |
|--------------------------------------------------------------------------------------|
| Members and Roles                                                                     |
| Maya - Owner                                                                          |
| Devin - Contributor                                                                   |
| [Invite collaborator]                                                                 |
|--------------------------------------------------------------------------------------|
| Branch Protection                                                                     |
| [x] Protect Main                                                                      |
| Required approvals: [1 v]                                                             |
|--------------------------------------------------------------------------------------|
| Workspace Preferences                                                                 |
| Cache size: [50 GB v]                                                                 |
| Ableton version detection: [Automatic v]                                              |
|--------------------------------------------------------------------------------------|
| [Save settings]                                                                       |
+--------------------------------------------------------------------------------------+
```

## 14. Wireframe-to-Component Mapping

Core mapping:

- shell frame -> `AppFrame`, `ProjectShell`, `ProjectTopStatusBar`, `ProjectContextPanel`
- project cards -> `ProjectCard`
- home cards -> `WorkspaceStatusCard`, `LatestApprovedVersionCard`, `EnvironmentWarningsCard`
- workspace diagnostics -> `LocalChangeSummaryCard`, `EnvironmentDiagnosticsList`
- version history -> `VersionList`, `VersionRow`
- change review -> `ChangeSummaryPanel`, `MergeReadinessPanel`, `ApprovalsPanel`
- modals -> `SaveVersionModal`, `PublishChangesModal`, `UpdateBlockedModal`, `ConflictResolutionModal`

## 15. Implementation Notes

These wireframes are meant to stabilize composition, not styling.

The next implementation step should scaffold:

1. the route tree
2. the persistent shell
3. the status bar and action cluster
4. the page entry components
5. the modal hosts and modal entry points
