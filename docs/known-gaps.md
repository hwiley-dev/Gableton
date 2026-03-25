# Gableton Known Gaps

## Purpose

Keep testing and planning honest by stating what is intentionally incomplete in the current codebase.

This document should be updated as gaps are closed or new ones are discovered.

## Auth and Session

- OAuth currently uses a local development account-picker surface, not a real hosted identity provider.
- macOS Keychain storage is implemented, but Windows Credential Manager and Linux secret storage are not.
- Silent token refresh before expiry is not complete.
- Session-expired UX is still basic.

## Desktop Runtime

- The packaged desktop app is buildable, but the current distribution path is not production-ready.
- Code signing is ad hoc.
- Apple notarization is not configured.
- The app icon and install polish are not finalized.

## Save, Publish, and Update

- Save version does not yet persist a full restorable local snapshot format.
- Publish and update are functional but still MVP-grade flows.
- Update does not yet represent the final safe-sync engine.
- Deleted-file reconciliation is not complete.

## Workspace and Media Handling

- Uploads are still effectively whole-file uploads in the current bridge path.
- Chunked deduplication is part of the architecture direction, not a finished implementation.
- Sample and plugin reconciliation are not finished.
- Environment portability checks are not complete.

## Collaboration Model

- Conflict-resolution UX is not finished.
- Review and comment behavior is still shallow compared with the long-term product goal.
- Permissions and authorship have a valid direction, but production-hardening is not complete.

## Testing Coverage

- The current project has smoke and manual testing coverage, not comprehensive automated integration coverage.
- There is no full end-to-end packaged-app regression suite yet.
- There is no load or performance test suite for large Ableton projects yet.
- Multi-user collaboration edge cases are not broadly validated yet.

## Distribution Readiness

- The app is not yet ready for broad non-technical public distribution.
- A DMG can be produced, but production signing, notarization, support policy, and updater behavior still need to be completed.
- Real hosted backend and auth-provider deployment still need final validation in packaged mode.

## Product Scope Boundary

Gableton is intended to be a collaboration layer around Ableton projects.

It is not currently trying to be:

- a DAW
- a real-time co-editing engine
- a full plugin-management platform
- a generalized cloud drive
