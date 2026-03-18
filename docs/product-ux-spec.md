# Gableton Product UX Spec

**Date:** March 18, 2026  
**Status:** Draft  
**Audience:** Product, design, desktop client engineering, backend engineering

## 1. Purpose

Define the Phase 1 user experience for Gableton so the product feels coherent, safe, and understandable to musicians collaborating on Ableton projects.

This spec is intentionally product-facing. It translates the architecture in [phase0-to-phase1-migration-spec.md](/Users/hunterwiley/Code-Projects/Gableton/docs/phase0-to-phase1-migration-spec.md) into concrete user workflows, screens, actions, and copy.

## 2. Product Principles

1. The product should feel like a collaboration tool for music, not a developer tool.
2. The user should always know whether their work is safe, shared, or at risk.
3. Saving personal progress and publishing team-visible progress are separate actions.
4. Environment problems are first-class UX: missing plugins, missing samples, version incompatibility.
5. The system must never silently overwrite local work.
6. When the system is unsure how to merge, it must stop and explain why.

## 3. Terminology

Primary user-facing terms:

- `Project`: the shared Ableton project.
- `Workspace`: the local folder connected to a project.
- `Version`: a saved snapshot of changes.
- `Change request`: a proposal to merge work into the shared project.
- `Main`: the approved shared line of work.
- `Update project`: sync latest approved changes into local workspace.
- `Restore version`: switch workspace to an earlier saved version.

Secondary advanced terms:

- `Branch`, `commit`, and `merge` may appear in advanced details panels.
- Advanced language should never be required for the primary flow.

## 4. Primary Users

### 4.1 Owner

Usually the person who created the project or controls the release.

Primary goals:

- invite collaborators
- protect `Main`
- review and merge incoming changes
- restore safe project states

### 4.2 Contributor

Any collaborator making creative edits.

Primary goals:

- sync latest project state
- work in Ableton normally
- save versions without fear
- publish changes for review

### 4.3 Reviewer

A maintainer or trusted collaborator who may not be actively editing the set.

Primary goals:

- understand what changed musically
- inspect risk and compatibility issues
- approve or reject clearly

## 5. UX Model

The Phase 1 product revolves around three primary actions:

- `Save version`
- `Publish changes`
- `Update project`

Everything else supports those actions.

Core mental model:

1. A user works in a local workspace.
2. They save versions as private or branch-level checkpoints.
3. They publish changes when ready to share.
4. If the project is protected, publishing creates a change request.
5. Approved changes land in `Main`.
6. Everyone else updates their project to receive them.

## 6. Information Architecture

Desktop app top-level navigation:

- `Projects`
- `Project Home`
- `Workspace`
- `Versions`
- `Change Requests`
- `Settings`

Project Home is the default landing page for an opened project.

## 7. Global Status Model

Every opened project must show a persistent status bar with:

- sync state
- local change state
- environment health
- publication state

### 7.1 Required top-level statuses

- `Up to date`
- `Changes not saved`
- `Version saved locally`
- `Ready to publish`
- `Publishing`
- `Review required`
- `Update available`
- `Conflict requires attention`
- `Missing sample`
- `Missing plugin`
- `Ableton version mismatch`

### 7.2 Status color rules

- Neutral: informational, no action required.
- Green: safe and up to date.
- Yellow: caution, user action recommended.
- Red: blocking problem or unsafe state.

### 7.3 Primary bar layout

Left side:

- project name
- current workspace
- current line of work (`Main` or branch label)

Center:

- summary state text

Right side:

- `Save version`
- `Publish changes`
- `Update project`

Button states:

- `Save version` enabled when local unsaved changes exist.
- `Publish changes` enabled when there is a saved unpublished version.
- `Update project` enabled when a newer approved remote state exists.

## 8. Primary Screens

### 8.1 Projects Screen

Purpose:

- list projects the user can access
- create project
- join/import project

Each project card shows:

- project name
- role (`Owner`, `Maintainer`, `Contributor`, `Viewer`)
- last activity
- current sync health
- open change requests count

Primary actions:

- `Open project`
- `Create project`
- `Import existing Ableton project`

Empty state copy:

- `No projects yet`
- `Create a new project or import an existing Ableton folder to start collaborating.`

### 8.2 Create Project Flow

Step 1:

- project name
- workspace folder selection
- optional import from existing Ableton folder

Step 2:

- branch protection default:
  - `Protect Main`
  - enabled by default

Step 3:

- invite collaborators by email or username
- assign role

Success state:

- `Project created`
- `Your workspace is connected. You can open Ableton and start working.`

### 8.3 Project Home

Purpose:

- show project health and recent activity
- anchor all daily actions

Sections:

- current status summary
- latest approved version
- your local workspace state
- recent versions
- open change requests
- environment warnings

Primary actions:

- `Open workspace folder`
- `Save version`
- `Publish changes`
- `Update project`

Example status cards:

- `You have unsaved local changes`
- `Main is 2 versions ahead of your workspace`
- `1 plugin is missing on this machine`
- `Your change request is waiting for review`

### 8.4 Workspace Screen

Purpose:

- show what is happening in the local workspace right now

Sections:

- workspace path
- tracked file scan state
- local change summary
- environment diagnostics
- current line of work

Change summary format:

- `Tracks changed: 3`
- `Audio files added: 2`
- `Automation changed: Yes`
- `Samples missing: 0`

Primary actions:

- `Open in Ableton`
- `Save version`
- `Discard local scan state`
- `Reveal changed items`

Important rule:

- The screen can show changed files in advanced mode, but default presentation should stay musical and high-level.

### 8.5 Save Version Modal

Purpose:

- convert current local state into a named, recoverable version

Fields:

- version title or message
- optional notes

Auto-generated summary:

- tracks added/removed
- clips moved/edited
- automation changed
- audio and sample changes
- environment warnings detected during scan

Primary action:

- `Save version`

Secondary action:

- `Cancel`

Validation:

- message required
- if scan incomplete, block save and show `Workspace scan still in progress`

Success copy:

- `Version saved`
- `Your changes are now safe locally and ready to publish when you want.`

### 8.6 Publish Changes Flow

Purpose:

- share a saved version with collaborators

Decision rule:

- if target line is not protected and user has permission, publish may update the target directly
- if target line is protected, publishing creates a change request

Fields:

- target line of work
- title
- description

Preflight checks:

- local scan complete
- version saved
- target base not stale
- no blocking environment corruption

Possible results:

- `Published to branch`
- `Change request created`
- `Publish blocked by conflict risk`

Preflight warnings:

- `Main has moved since your last update`
- `This workspace is missing plugins used in the set`
- `Your changes overlap with recent edits on Main`

### 8.7 Versions Screen

Purpose:

- show local and shared history in a musician-readable format

Each version row shows:

- title
- author
- timestamp
- target line
- review state
- short musical diff summary

Primary actions:

- `View details`
- `Restore version`
- `Create change request from this version`

Version detail panel:

- full summary
- environment snapshot
- linked change request
- advanced metadata toggle

### 8.8 Change Requests Screen

Purpose:

- central review workflow

Each row shows:

- title
- author
- source line
- target line
- status
- approvals
- conflict or warning badge

Primary actions:

- `Open`
- `Approve`
- `Request changes`
- `Merge`

### 8.9 Change Request Detail

Purpose:

- let reviewers understand the change quickly and safely

Sections:

- title and author
- overall change summary
- musical diff summary
- environment warnings
- comments and approvals
- merge readiness

Review summary should answer:

- what changed musically
- what assets were added or replaced
- whether environment issues exist
- whether merge is safe

Primary actions:

- `Approve`
- `Request changes`
- `Merge to Main`

Merge block states:

- `Approval required`
- `Main moved, update required`
- `Conflict requires manual resolution`
- `Missing required assets`

### 8.10 Restore Version Flow

Purpose:

- safely return local workspace to a previous version

Critical rule:

- restoring is local until explicitly published

If unsaved local changes exist:

- block immediate restore
- offer:
  - `Save version first`
  - `Cancel`

Confirmation copy:

- `Restore this version to your workspace?`
- `Your current unsaved changes will not be kept unless you save a version first.`

Success copy:

- `Version restored to workspace`

### 8.11 Settings

Project settings:

- members and roles
- branch protection
- required approvals
- storage and cache preferences

Workspace settings:

- local workspace path
- cache size
- Ableton version detection
- plugin scan preferences

## 9. End-to-End User Flows

### 9.1 Contributor: normal work session

1. Open project.
2. See current status.
3. Click `Update project` if needed.
4. Click `Open in Ableton`.
5. Make changes in Ableton.
6. Return to Gableton.
7. Wait for scan to finish.
8. Click `Save version`.
9. Review generated summary.
10. Add a message and save.
11. Click `Publish changes`.
12. Submit change request.
13. Track review status from Project Home.

### 9.2 Owner: review and merge

1. Open project.
2. See pending change request card.
3. Open change request.
4. Review diff summary and warnings.
5. Approve if acceptable.
6. Click `Merge to Main`.
7. Project Home updates to show new latest approved version.

### 9.3 Reviewer: request revision

1. Open change request.
2. Read summary.
3. Identify issue.
4. Click `Request changes`.
5. Add comment.
6. Contributor sees request on Project Home and in change request detail.

### 9.4 User: update local workspace

1. Open project.
2. See `Update available`.
3. Click `Update project`.
4. If no local unsaved changes, sync proceeds.
5. If local unsaved changes exist, block and offer:
   - `Save version`
   - `Cancel`

### 9.5 User: resolve merge conflict

1. Publish attempt or merge attempt detects overlap.
2. Gableton shows `Conflict requires attention`.
3. Conflict panel explains the overlapping regions in plain language.
4. User chooses `Open in Ableton to resolve`.
5. User resolves manually in Ableton.
6. User returns and saves a new version.
7. User republishes.

## 10. Copy Rules

Product copy should be direct and operational.

Preferred style:

- `You have changes that are not saved yet.`
- `Main has new changes. Update before publishing.`
- `This project uses plugins not found on this machine.`
- `Your changes overlap with newer edits and need manual resolution.`

Avoid:

- abstract Git terminology in primary CTAs
- ambiguous technical phrases like `non-fast-forward`
- blame-heavy wording

## 11. Empty States

### 11.1 No local changes

- `No local changes`
- `Open Ableton and edit the project, then return here to save a version.`

### 11.2 No versions yet

- `No versions yet`
- `Save your first version to create a recoverable checkpoint.`

### 11.3 No change requests

- `No change requests`
- `Published work that needs approval will appear here.`

### 11.4 No collaborators

- `Only you can access this project right now`
- `Invite collaborators from Settings when you're ready to work together.`

## 12. Blocking States and Guardrails

### 12.1 Never allow silent overwrite

Blocked actions:

- update workspace over unsaved local changes
- restore version over unsaved local changes
- publish from stale base without warning

### 12.2 Missing sample

User-facing treatment:

- red warning badge
- clear affected path count
- block merge if required assets are missing from the published version

Primary action:

- `Locate missing files`

### 12.3 Missing plugin

User-facing treatment:

- yellow or red depending on severity
- shown in Workspace, Version details, and Change Request detail

Primary actions:

- `Review plugin list`
- `Continue with warning` if allowed

### 12.4 Ableton version mismatch

User-facing treatment:

- yellow warning by default
- red if project policy blocks it

Primary action:

- `Review compatibility`

## 13. Diff Presentation Rules

Default diff should be musical, not file-centric.

Preferred order:

1. tracks added, removed, renamed
2. clips added, moved, deleted
3. automation changed
4. devices or routing changed
5. audio and sample assets added or replaced
6. environment warnings

Advanced mode may show:

- changed file paths
- internal identifiers
- raw metadata fields

## 14. Notification Rules

The app should notify for:

- your change request approved
- your change request merged
- your change request needs changes
- project update available
- conflict detected on publish
- plugin or sample issue detected

Notifications should always link to the exact affected screen.

## 15. Desktop App MVP Layout

Recommended shell:

- left navigation rail
- main content column
- right side context panel for warnings, approvals, or diff details

Persistent footer or header status bar:

- sync state
- local changes
- environment health

This layout supports the product model without forcing modal-heavy interaction.

## 16. Advanced Mode

Advanced mode is optional and off by default.

When enabled, users may see:

- branch names
- commit IDs
- manifest hash
- file-level changes
- storage diagnostics

Advanced mode must not change the primary action labels.

## 17. MVP Exclusions

Not required for Phase 1 UX:

- realtime presence in the timeline
- live co-editing in Ableton
- automatic semantic conflict resolution
- waveform-level diff review
- chat embedded in the arranger

## 18. Acceptance Criteria

The Phase 1 UX is acceptable when:

1. A new user can create a project and connect a workspace without learning Git terms.
2. A contributor can save a version and publish changes without confusion about whether work is local or shared.
3. A reviewer can understand what changed from the summary without opening raw files.
4. The app clearly blocks unsafe updates and restores.
5. Missing plugins, missing samples, and version mismatches are visible before merge.
6. Merge conflict handling routes users into a clear manual resolution path.

## 19. Implementation Notes

Design and engineering should treat these as required distinctions:

- `unsaved local changes` is different from `saved but unpublished`
- `published` is different from `merged`
- `restored locally` is different from `shared with collaborators`

If these states blur in the UI, users will lose trust in the system.
