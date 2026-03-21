# Gableton Desktop Runtime Architecture

## Decision

For the first packaged desktop release, Gableton should use:

- `Electron` for the desktop shell
- `React + Vite` for the renderer
- `Preload bridge` for safe renderer-to-native calls
- `Cloud backend API` for auth, repositories, versions, change requests, and blob signing

This is an MVP productization decision, not a permanent ideological choice.

## Why Electron First

Electron is the most pragmatic first runtime for this repository because:

- the current app is already a React/Vite frontend
- the current integration surface is already JavaScript/TypeScript shaped
- DMG packaging is straightforward with mature tooling
- preload bridges are well-understood and align with the existing `window.gabletonDesktopBridge` contract
- filesystem access, watchers, dialogs, keychain integration, and auto-update are all standard desktop concerns in Electron

## Why Not Tauri First

Tauri remains a valid future option, but it is not the best first move here.

Tauri advantages:

- smaller installer size
- lower runtime memory overhead
- tighter default security model

Tauri disadvantages for this phase:

- introduces Rust as a required runtime/backend layer immediately
- increases implementation complexity before the product behavior is stable
- slows the first packaged release while the team is still validating the collaboration model

The correct sequence is:

1. ship the product behavior
2. validate usage
3. revisit runtime optimization if bundle size or memory meaningfully hurts adoption

## Product Delivery Model

Non-technical users should only need to:

1. download a DMG
2. install the app
3. sign in
4. connect or open an Ableton project
5. use `Save version`, `Publish changes`, and `Update project`

They should not need:

- Terminal
- Git
- environment variables
- local server setup
- separate sync tools

## Supported Distribution

Initial packaging target:

- `macOS app bundle` inside a `.dmg`

Initial support target:

- `macOS 13+`
- `Apple Silicon` first
- `Intel` optional if the build pipeline and testing budget allow universal binaries early

Release requirements:

- Apple Developer signing
- notarization
- hardened runtime

Without signing and notarization, a DMG may technically exist but it is not a production-ready install experience.

## Runtime Model

Gableton desktop should have three runtime layers:

1. `Renderer`
   - React UI
   - no direct filesystem access
   - no Node integration

2. `Preload`
   - typed safe bridge exposed as `window.gabletonDesktopBridge`
   - marshals requests between renderer and main

3. `Main`
   - owns windows
   - owns dialogs
   - owns local persistence paths
   - owns filesystem/watcher/process integrations
   - owns secure credential storage integration

## Native Responsibilities

The desktop host must own:

- selecting and validating Ableton project folders
- watching workspace changes
- detecting whether Ableton is open for the target workspace
- hashing/chunking uploads
- local version persistence
- downloading signed objects
- applying workspace updates to disk
- OS keychain/token storage
- opening Ableton or revealing project folders in Finder

The renderer must not own these concerns directly.

## Auth Model

Recommended auth flow:

- system-browser OAuth or device flow
- callback/deep-link back into the desktop app
- access and refresh tokens stored in the OS keychain

Avoid:

- password collection in the desktop renderer
- storing long-lived secrets in plain files

## Local Storage Model

Desktop-local state should be split clearly:

- `OS keychain`
  - auth tokens

- `App support directory`
  - cached manifests
  - chunk cache
  - workspace metadata
  - saved local versions
  - logs

- `User workspace path`
  - actual Ableton project files

The app should never mix credential storage with workspace data.

## Startup Flow

Production startup should be:

1. launch app
2. restore session from keychain if possible
3. fetch user projects from backend
4. show desktop shell
5. hydrate local project metadata
6. start workspace watchers only for active/open workspaces

If there is no valid session:

1. show sign-in screen
2. complete browser auth
3. return to project list

## Packaging Strategy

Packaging goals for the first desktop release:

- one downloadable DMG
- one installed app
- bundled preload and main process
- bundled renderer assets
- no separate daemon or server install

Development-only helpers remain acceptable in source control, but they must not leak into the user installation model.

## Auto Update

Auto update should be supported, but not block the first internal alpha.

Priority order:

1. signed/notarized DMG
2. stable auth/session handling
3. stable native bridge
4. auto update

## Security Posture

Desktop defaults should be:

- `contextIsolation: true`
- `nodeIntegration: false`
- preload-only native bridge
- explicit IPC channels
- minimal filesystem permissions
- strict allowlist for external URLs

## MVP Packaging Scope

The first packaged desktop milestone should prove:

- app launches as an installed desktop app
- sign-in works
- project home loads
- `Save version` works through the desktop bridge
- `Publish changes` works through the desktop bridge and backend
- `Update project` works through the desktop bridge and backend

The milestone does not need:

- auto update
- full review/comment system in desktop
- true sample/plugin reconciliation
- realtime collaboration

## Revisit Criteria

Revisit the Electron decision only if one of these becomes materially harmful:

- installer size
- memory usage while idle
- bridge security constraints
- hashing/chunking performance
- update pipeline reliability

Until then, changing runtime would be premature churn.
