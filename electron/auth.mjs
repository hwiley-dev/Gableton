import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { shell } from "electron";
import { promisify } from "node:util";

const KEYCHAIN_SERVICE = "com.gableton.desktop.refresh-token";
const OAUTH_CALLBACK_HOST = "127.0.0.1";
const OAUTH_CALLBACK_PATH = "/oauth/callback";
const execFileAsync = promisify(execFile);

function normalizeApiBaseUrl(apiBaseUrl) {
  return String(apiBaseUrl || "").trim().replace(/\/+$/, "");
}

function keychainAccount(apiBaseUrl) {
  try {
    return new URL(normalizeApiBaseUrl(apiBaseUrl)).origin;
  } catch {
    return normalizeApiBaseUrl(apiBaseUrl);
  }
}

function toBase64Url(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createPkcePair() {
  const verifier = toBase64Url(randomBytes(48));
  const challenge = toBase64Url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

function createOAuthState() {
  return toBase64Url(randomBytes(24));
}

class HttpStatusError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "HttpStatusError";
    this.status = status;
  }
}

async function requestJson(url, init) {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof payload.error === "string"
        ? payload.error
        : `Auth request failed with status ${response.status}.`;
    throw new HttpStatusError(message, response.status);
  }

  return payload;
}

function mapAuthSession(payload) {
  const user = payload.user && typeof payload.user === "object" ? payload.user : {};

  return {
    session: {
      user: {
        id: typeof user.id === "string" ? user.id : "unknown_user",
        email: typeof user.email === "string" ? user.email : "",
        displayName:
          typeof user.display_name === "string"
            ? user.display_name
            : typeof user.displayName === "string"
              ? user.displayName
              : "Unknown User"
      },
      accessToken: typeof payload.access_token === "string" ? payload.access_token : "",
      accessTokenExpiresAt:
        typeof payload.expires_at === "string"
          ? payload.expires_at
          : new Date(Date.now() + 60 * 60 * 1000).toISOString()
    },
    refreshToken: typeof payload.refresh_token === "string" ? payload.refresh_token : ""
  };
}

async function readRefreshToken(apiBaseUrl) {
  if (process.platform !== "darwin") {
    throw new Error("OS keychain session storage is currently implemented for macOS only.");
  }

  try {
    const { stdout } = await execFileAsync("security", [
      "find-generic-password",
      "-a",
      keychainAccount(apiBaseUrl),
      "-s",
      KEYCHAIN_SERVICE,
      "-w"
    ]);
    return stdout.trim() || null;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      return null;
    }
    throw error;
  }
}

async function writeRefreshToken(apiBaseUrl, refreshToken) {
  if (process.platform !== "darwin") {
    throw new Error("OS keychain session storage is currently implemented for macOS only.");
  }

  await execFileAsync("security", [
    "add-generic-password",
    "-a",
    keychainAccount(apiBaseUrl),
    "-s",
    KEYCHAIN_SERVICE,
    "-w",
    refreshToken,
    "-U"
  ]);
}

async function deleteRefreshToken(apiBaseUrl) {
  if (process.platform !== "darwin") {
    return;
  }

  try {
    await execFileAsync("security", [
      "delete-generic-password",
      "-a",
      keychainAccount(apiBaseUrl),
      "-s",
      KEYCHAIN_SERVICE
    ]);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      return;
    }
    throw error;
  }
}

async function waitForOAuthCallback({ apiBaseUrl, loginHint }) {
  const state = createOAuthState();
  const pkce = createPkcePair();

  return await new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      const requestUrl = new URL(
        request.url || OAUTH_CALLBACK_PATH,
        `http://${OAUTH_CALLBACK_HOST}`
      );

      if (requestUrl.pathname !== OAUTH_CALLBACK_PATH) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }

      const returnedState = requestUrl.searchParams.get("state");
      const code = requestUrl.searchParams.get("code");
      const error = requestUrl.searchParams.get("error");

      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(
        `<!doctype html><html><body style="font-family: -apple-system, sans-serif; padding: 24px;"><h1>Gableton</h1><p>You can return to the app now.</p></body></html>`
      );

      if (error) {
        cleanup(() => reject(new Error(error)));
        return;
      }

      if (!code || returnedState !== state) {
        cleanup(() => reject(new Error("OAuth callback validation failed.")));
        return;
      }

      cleanup(() =>
        resolve({
          code,
          codeVerifier: pkce.verifier,
          redirectUri,
          state
        })
      );
    });

    let redirectUri = "";
    const timeout = setTimeout(() => {
      cleanup(() => reject(new Error("Browser sign-in timed out.")));
    }, 3 * 60 * 1000);

    const cleanup = (callback) => {
      clearTimeout(timeout);
      server.close(() => callback());
    };

    server.on("error", (error) => {
      cleanup(() =>
        reject(error instanceof Error ? error : new Error("OAuth callback server failed."))
      );
    });

    server.listen(0, OAUTH_CALLBACK_HOST, async () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      redirectUri = `http://${OAUTH_CALLBACK_HOST}:${port}${OAUTH_CALLBACK_PATH}`;

      const authorizeUrl = new URL(`${normalizeApiBaseUrl(apiBaseUrl)}/v1/oauth/authorize`);
      authorizeUrl.searchParams.set("response_type", "code");
      authorizeUrl.searchParams.set("client_id", "gableton-desktop");
      authorizeUrl.searchParams.set("redirect_uri", redirectUri);
      authorizeUrl.searchParams.set("state", state);
      authorizeUrl.searchParams.set("code_challenge", pkce.challenge);
      authorizeUrl.searchParams.set("code_challenge_method", "S256");
      if (loginHint) {
        authorizeUrl.searchParams.set("login_hint", loginHint);
      }

      try {
        await shell.openExternal(authorizeUrl.toString());
      } catch (openError) {
        cleanup(() =>
          reject(
            openError instanceof Error ? openError : new Error("Opening the browser failed.")
          )
        );
      }
    });
  });
}

export async function signInWithSystemBrowser(input) {
  const callback = await waitForOAuthCallback(input);
  const payload = await requestJson(`${normalizeApiBaseUrl(input.apiBaseUrl)}/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: callback.code,
      redirect_uri: callback.redirectUri,
      code_verifier: callback.codeVerifier,
      client_id: "gableton-desktop"
    })
  });
  const result = mapAuthSession(payload);

  if (!result.refreshToken) {
    throw new Error("OAuth token response did not include a refresh token.");
  }

  await writeRefreshToken(input.apiBaseUrl, result.refreshToken);
  return result.session;
}

export async function restoreStoredSession(apiBaseUrl) {
  const refreshToken = await readRefreshToken(apiBaseUrl);
  if (!refreshToken) {
    return null;
  }

  try {
    const payload = await requestJson(`${normalizeApiBaseUrl(apiBaseUrl)}/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    const result = mapAuthSession(payload);
    if (result.refreshToken && result.refreshToken !== refreshToken) {
      await writeRefreshToken(apiBaseUrl, result.refreshToken);
    }
    return result.session;
  } catch (error) {
    if (error instanceof HttpStatusError && (error.status === 401 || error.status === 403)) {
      await deleteRefreshToken(apiBaseUrl);
      return null;
    }
    throw error;
  }
}

export async function signOutStoredSession(apiBaseUrl) {
  const refreshToken = await readRefreshToken(apiBaseUrl);

  if (refreshToken) {
    await fetch(`${normalizeApiBaseUrl(apiBaseUrl)}/v1/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken })
    }).catch(() => undefined);
  }

  await deleteRefreshToken(apiBaseUrl);
}
