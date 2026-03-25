# Gableton Manual Smoke Checklist

## Scope

Use this checklist for the current desktop-development milestone.

Primary target:

- `npm run dev:desktop`

Secondary target when packaging changes:

- packaged macOS app from `npm run dist:mac`

## Before You Start

- confirm dependencies are installed
- confirm a local Ableton project workspace is available
- confirm the local dev API can start

## Startup

- [ ] Run `npm run dev:desktop`
- [ ] Electron window opens successfully
- [ ] App does not show a blank screen or crash on boot
- [ ] Signed-out state shows the browser-based login screen

## Auth

- [ ] Click `Continue in browser`
- [ ] Default browser opens to the development OAuth flow
- [ ] Completing browser sign-in returns control to the desktop app
- [ ] App enters authenticated state without manual refresh
- [ ] Project list loads after sign-in

## Session Restore

- [ ] Quit the desktop app
- [ ] Relaunch the desktop app
- [ ] Previous session restores automatically
- [ ] User identity is still shown correctly in the app shell

## Sign Out

- [ ] Use the sign-out action from the app
- [ ] App returns to signed-out state
- [ ] Protected project views are no longer available

## Project Navigation

- [ ] Open a project from the project list
- [ ] Project home renders without layout breakage
- [ ] Versions view renders
- [ ] Change requests view renders
- [ ] Navigation between these views works without app reset

## Save Version

- [ ] Modify the connected workspace so the app detects local changes
- [ ] `Save version` becomes available
- [ ] Open the `Save version` modal
- [ ] Enter a version message and confirm
- [ ] Save completes successfully
- [ ] Top status updates to local saved state

## Publish Changes

- [ ] Open the `Publish changes` modal after a valid save
- [ ] Confirm publish
- [ ] Publish completes successfully
- [ ] Project status updates to review-required or published state
- [ ] New change request appears in the list

## Workspace Drift Protection

- [ ] Save a version
- [ ] Modify the workspace again before publishing
- [ ] Try to publish
- [ ] Publish is blocked because the workspace changed after the save

## Update Project

- [ ] Trigger `Update project`
- [ ] Update completes without renderer crash
- [ ] Expected files are written into the workspace
- [ ] App status reflects the updated workspace state

## Packaging Smoke

- [ ] Run `npm run dist:mac`
- [ ] App bundle is created
- [ ] DMG is created
- [ ] Packaged app launches
- [ ] Login screen renders in packaged mode

## Record Failures

For any failed item, capture:

- exact step
- expected result
- actual result
- terminal output
- renderer console output
- whether failure occurred in dev or packaged mode
