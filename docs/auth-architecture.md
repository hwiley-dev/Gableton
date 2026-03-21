# Gableton Desktop Auth Architecture

## Goal

Provide a desktop-first auth model that is safe for non-technical users and compatible with collaboration features such as authorship, permissions, protected branches, and review workflows.

## Desktop session model

- The renderer never stores a long-lived refresh token.
- The desktop host owns refresh-token storage and refresh logic.
- The renderer only receives a short-lived access token and user profile in memory.
- Signing out clears the stored refresh token and drops the in-memory access token.

## Current implementation

### Renderer

- `AuthSessionProvider`
  - bootstraps the session on startup
  - calls the desktop bridge to restore, start browser sign-in, and sign out
  - exposes authenticated user/session state to the app
- `ApiClientProvider`
  - uses the access token from `AuthSessionProvider`
  - recreates the HTTP client when the access token changes
- `LoginPage`
  - blocks the app until the user signs in successfully
  - starts the system-browser OAuth flow
- `OAuthCallbackPage`
  - used only for browser-only development
  - receives the popup redirect and posts the auth code back to the opener window

### Desktop host

- `electron/auth.mjs`
  - opens the system browser for OAuth authorization
  - hosts a loopback callback server on `127.0.0.1`
  - verifies `state` and PKCE
  - exchanges the auth code for tokens
  - stores the refresh token in macOS Keychain via the `security` CLI
  - calls backend `/v1/oauth/token`, `/v1/auth/refresh`, and `/v1/auth/logout`
  - returns only short-lived session material to the renderer
- `electron/preload.mjs`
  - exposes auth IPC methods to the renderer

### Development helpers

- `src/dev/installBrowserDesktopBridge.ts`
  - stores the refresh token in localStorage for browser-only development
- `scripts/dev-api.mjs`
  - exposes local dev auth endpoints and enforces bearer auth on repo endpoints

## Backend assumptions

The backend is expected to provide:

- `GET /v1/oauth/authorize`
  - input: `response_type=code`, `client_id`, `redirect_uri`, `state`, `code_challenge`, `code_challenge_method`
  - behavior: authenticate the user in the system browser and redirect back with `code` and `state`
- `POST /v1/oauth/token`
  - input: `grant_type=authorization_code`, `code`, `redirect_uri`, `code_verifier`, `client_id`
  - output: `user`, `access_token`, `refresh_token`, `expires_at`
- `POST /v1/auth/refresh`
  - input: `refresh_token`
  - output: `user`, `access_token`, `refresh_token`, `expires_at`
- `POST /v1/auth/logout`
  - input: `refresh_token`
  - output: success marker

Protected repository endpoints are expected to require:

- `Authorization: Bearer <access_token>`

## Security posture

- Refresh token: desktop host only, persisted in OS keychain
- Access token: renderer memory only
- User identity for publish/review: taken from the authenticated session
- Backend authorship: should be derived from the authenticated token, not trusted from client-provided display names

## Next hardening steps

1. Replace the development account-picker browser page with the real hosted identity surface.
2. Rotate refresh tokens on refresh and persist the rotated value.
3. Add token expiry handling and silent refresh before protected API calls fail.
4. Add a session-expired UX path instead of dropping directly to signed-out state.
5. Add Windows Credential Manager and Linux Secret Service support if non-macOS distribution becomes a requirement.
