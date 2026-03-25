# Gableton Testing Guide

## Goal

Define a practical testing approach for the current Gableton desktop codebase.

This guide is intentionally scoped to the product as it exists now:

- Electron desktop shell
- React renderer
- local development API
- system-browser OAuth development flow
- desktop bridge for save, publish, and update

It is not a release-certification guide for a production-ready desktop app.

## What Can Be Tested Now

The project is ready for meaningful testing in these areas:

- Type and build correctness
- Local API contract behavior
- Desktop auth flow wiring
- Core user actions: `Save version`, `Publish changes`, `Update project`
- Workspace safety checks
- Packaged desktop build generation

The project is not yet ready for full end-user acceptance testing across real teams, real hosted auth, or notarized distribution.

## Test Layers

### 1. Static and build verification

Run these first on every meaningful change:

```bash
npm run typecheck
npm run build:web
npm run build:desktop
```

These checks answer:

- Does the TypeScript surface still compile?
- Does the renderer still build?
- Does the Electron package still assemble?

### 2. API contract smoke

Run the local API smoke test when auth, version flow, or sync flow changes.

Start the dev API in one terminal:

```bash
npm run dev:api
```

Run the smoke test in another:

```bash
npm run smoke:api
```

This validates:

- OAuth authorize and token exchange
- refresh and logout
- authenticated repository access
- publish/finalize behavior
- change request creation
- manifest fetch

For a repeatable one-command version of the current core smoke path, use:

```bash
npm run smoke:full
```

This currently performs:

- local dev API startup
- `npm run typecheck`
- `npm run build:web`
- `npm run smoke:api`
- `npm run build:desktop`

It does not replace the manual desktop checklist.

### 3. Desktop integration smoke

Use this when renderer, Electron bridge, or UX flow changes:

```bash
npm run dev:desktop
```

This launches:

- local API on `127.0.0.1:8788`
- Vite renderer on `127.0.0.1:4174`
- Electron desktop shell

This is the main development environment for manual testing.

### 4. Packaged app smoke

Use this when packaging, preload, startup, or auth bootstrap changes:

```bash
npm run dist:mac
```

Then test the generated macOS app bundle or DMG.

This check is about:

- app startup
- preload wiring
- packaged asset loading
- desktop-host behavior outside Vite dev mode

## Recommended Test Order

For most changes, use this order:

1. `npm run typecheck`
2. `npm run build:web`
3. `npm run smoke:api`
4. `npm run smoke:full` when you want the full automated core pass
5. `npm run dev:desktop`
6. manual smoke checklist
7. `npm run dist:mac` when packaging-sensitive code changed

## Environment Prerequisites

Current practical prerequisites:

- macOS
- Node.js and npm installed
- working Electron build dependencies
- local filesystem access to an Ableton project workspace

For the current development auth flow:

- the local API must be reachable at `http://127.0.0.1:8788`
- browser sign-in is satisfied by the development OAuth account-picker page

## Current Test Modes

### Browser-only development

This mode is useful for fast UI checks.

It is not the authoritative auth or desktop-bridge environment.

Use it for:

- route rendering
- visual checks
- basic state handling

Do not use it as the final test for:

- system-browser OAuth
- keychain behavior
- Electron preload behavior
- packaged app behavior

### Desktop development

This is the main integration-test mode.

Use it for:

- real desktop auth flow
- bridge-driven save/publish/update
- session restore
- sign-out
- project and change-request views

### Packaged desktop app

Use this for:

- startup and install-adjacent smoke
- preload/renderer boot in packaged form
- asset resolution
- basic desktop behavior outside the dev server loop

## High-Value Manual Test Areas

These should be exercised regularly:

### Auth

- first sign-in from signed-out state
- app relaunch with stored session
- sign-out
- invalid or expired session recovery

### Project shell

- project list loads
- project home route renders
- versions route renders
- change requests route renders
- status bar reflects workspace state transitions

### Save version

- save succeeds when workspace has changes
- save is blocked or disabled when there are no changes
- status changes to local-saved state
- changed workspace after save updates the status correctly

### Publish changes

- publish succeeds after a valid save
- publish is blocked if workspace drifted after save
- published state reflects the returned remote commit id
- change request appears in the list after publish

### Update project

- update fetches manifest and downloads blobs
- update writes expected files into the workspace
- update does not silently overwrite unsafe local changes

## Failure Reporting Format

When a test fails, capture:

1. exact command or flow used
2. expected result
3. actual result
4. route or screen
5. console or terminal output
6. whether failure happened in browser-dev, desktop-dev, or packaged mode

This matters because many failures will be mode-specific.

## Minimum Gate Before New Feature Work

Before layering more product behavior on top of the current stack, the following should stay green:

- `npm run typecheck`
- `npm run build:web`
- `npm run build:desktop`
- `npm run smoke:api`
- `npm run smoke:full`
- manual smoke checklist for auth + save + publish + update

## What This Guide Does Not Claim

This guide does not claim that Gableton is ready for:

- real hosted OAuth production auth
- notarized public distribution
- full plugin/sample reconciliation
- multi-user conflict resolution validation
- heavy-load sync testing

Those belong to later test plans.
