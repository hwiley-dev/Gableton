import { createServer } from "node:http";
import { createHash, randomUUID } from "node:crypto";

const PORT = Number(process.env.GABLETON_API_PORT || 8788);
const HOST = process.env.GABLETON_API_HOST || "127.0.0.1";
const ORIGIN = `http://${HOST}:${PORT}`;

const objectStore = new Map();
const accessSessions = new Map();
const refreshSessions = new Map();
const authCodes = new Map();
let commitCounter = 1;
let changeRequestCounter = 1;

function isoNow() {
  return new Date().toISOString();
}

function isoLater(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function makeHash(seed) {
  return `sha256:${seed.replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase()}`;
}

function makeToken(prefix) {
  return `${prefix}_${randomUUID()}`;
}

function toBase64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createPkceChallenge(verifier) {
  return toBase64Url(createHash("sha256").update(verifier).digest());
}

function manifestForRepo(repoId) {
  return {
    version: 1,
    repoFormat: "gableton-phase1",
    files: [
      {
        path: "Live Set/Main.als",
        blobHash: makeHash(`${repoId}_main_als_remote`)
      }
    ]
  };
}

function serializeManifest(manifest) {
  return {
    version: manifest.version,
    repo_format: manifest.repoFormat,
    files: manifest.files.map((file) => ({
      path: file.path,
      blob_hash: file.blobHash
    }))
  };
}

function createRepo(id, name) {
  const remoteCommitId = "commit:remote";
  const manifest = manifestForRepo(id);
  const versions = [
    {
      id: remoteCommitId,
      title: "Initial approved version",
      author: "System",
      createdAt: isoNow(),
      state: "published",
      summary: "Bootstrap remote head"
    }
  ];

  objectStore.set(`blob:${manifest.files[0].blobHash}`, Buffer.from(`remote-live-set:${id}`, "utf8"));
  objectStore.set(`manifest:${makeHash(`${id}_manifest_remote`)}`, Buffer.from(JSON.stringify(serializeManifest(manifest)), "utf8"));

  return {
    id,
    name,
    defaultBranch: "main",
    refHeads: { main: remoteCommitId },
    stagedCommits: new Map(),
    commits: new Map([[remoteCommitId, { manifest, createdAt: isoNow() }]]),
    versions,
    pullRequests: [
      {
        id: "cr_1",
        title: "Add bridge synth textures",
        author: "Maya",
        status: "open",
        approvals: 0
      }
    ]
  };
}

const repos = new Map([
  ["project_neon_horizon", createRepo("project_neon_horizon", "Neon Horizon")],
  ["project_tape_bloom", createRepo("project_tape_bloom", "Tape Bloom")]
]);

function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    display_name: user.displayName
  };
}

function buildUserFromEmail(email) {
  if (typeof email !== "string" || !email.trim()) {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const displayName =
    normalizedEmail === "hunter@gableton.dev"
      ? "Hunter Wiley"
      : normalizedEmail === "maya@gableton.dev"
        ? "Maya"
        : normalizedEmail.split("@")[0]
            .split(/[._-]/g)
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ") || "Gableton User";

  return {
    id: `user_${normalizedEmail.replace(/[^a-z0-9]+/g, "_")}`,
    email: normalizedEmail,
    displayName
  };
}

function resolveLoginUser(email, password) {
  if (typeof password !== "string" || !password.trim() || password !== "gableton-dev") {
    return null;
  }

  return buildUserFromEmail(email);
}

function issueSession(user, refreshToken = makeToken("refresh")) {
  const accessToken = makeToken("access");
  const session = {
    user,
    refreshToken,
    accessToken,
    expiresAt: isoLater(1)
  };

  accessSessions.set(accessToken, session);
  refreshSessions.set(refreshToken, { user });
  return session;
}

function sendSession(response, session) {
  sendJson(response, 200, {
    user: serializeUser(session.user),
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
    expires_at: session.expiresAt
  });
}

function beginAuthorizationCode(user, redirectUri, codeChallenge) {
  const code = makeToken("code");
  authCodes.set(code, {
    user,
    redirectUri,
    codeChallenge
  });
  return code;
}

function getAuthSession(request, response) {
  const authorization = request.headers.authorization;
  const bearerToken =
    typeof authorization === "string" && authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : "";

  const session = accessSessions.get(bearerToken);
  if (!session) {
    sendJson(response, 401, { error: "Authentication required." });
    return undefined;
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    accessSessions.delete(bearerToken);
    sendJson(response, 401, { error: "Access token expired." });
    return undefined;
  }

  return session;
}

function withCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}

function sendJson(response, statusCode, payload) {
  withCorsHeaders(response);
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, payload, contentType = "application/octet-stream") {
  withCorsHeaders(response);
  response.writeHead(statusCode, { "Content-Type": contentType });
  response.end(payload);
}

function readBuffer(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

async function readJson(request) {
  const buffer = await readBuffer(request);
  if (!buffer.length) {
    return {};
  }
  return JSON.parse(buffer.toString("utf8"));
}

function getRepo(repoId, response) {
  const repo = repos.get(repoId);
  if (!repo) {
    sendJson(response, 404, { error: `Unknown repo ${repoId}` });
    return undefined;
  }
  return repo;
}

function matchPath(pathname, pattern) {
  const pathSegments = pathname.split("/").filter(Boolean);
  const patternSegments = pattern.split("/").filter(Boolean);

  if (pathSegments.length !== patternSegments.length) {
    return undefined;
  }

  const params = {};
  for (let index = 0; index < patternSegments.length; index += 1) {
    const patternSegment = patternSegments[index];
    const pathSegment = pathSegments[index];
    if (patternSegment.startsWith(":")) {
      params[patternSegment.slice(1)] = decodeURIComponent(pathSegment);
      continue;
    }
    if (patternSegment !== pathSegment) {
      return undefined;
    }
  }
  return params;
}

const server = createServer(async (request, response) => {
  const method = request.method || "GET";
  const url = new URL(request.url || "/", ORIGIN);
  const { pathname } = url;

  if (method === "OPTIONS") {
    withCorsHeaders(response);
    response.writeHead(204);
    response.end();
    return;
  }

  if (method === "GET" && pathname === "/health") {
    sendJson(response, 200, { status: "ok", origin: ORIGIN });
    return;
  }

  if (method === "GET" && pathname === "/v1/oauth/authorize") {
    const redirectUri = url.searchParams.get("redirect_uri") || "";
    const state = url.searchParams.get("state") || "";
    const codeChallenge = url.searchParams.get("code_challenge") || "";
    const loginHint = url.searchParams.get("login_hint");

    if (!redirectUri || !state || !codeChallenge) {
      sendJson(response, 400, { error: "Missing OAuth authorize parameters." });
      return;
    }

    const hintedUser = loginHint ? buildUserFromEmail(loginHint) : null;
    if (hintedUser) {
      const redirectTarget = new URL(redirectUri);
      redirectTarget.searchParams.set("code", beginAuthorizationCode(hintedUser, redirectUri, codeChallenge));
      redirectTarget.searchParams.set("state", state);
      response.writeHead(302, { Location: redirectTarget.toString() });
      response.end();
      return;
    }

    const hunterLink = new URL(`${ORIGIN}/v1/oauth/approve`);
    hunterLink.searchParams.set("redirect_uri", redirectUri);
    hunterLink.searchParams.set("state", state);
    hunterLink.searchParams.set("code_challenge", codeChallenge);
    hunterLink.searchParams.set("account", "hunter@gableton.dev");

    const mayaLink = new URL(`${ORIGIN}/v1/oauth/approve`);
    mayaLink.searchParams.set("redirect_uri", redirectUri);
    mayaLink.searchParams.set("state", state);
    mayaLink.searchParams.set("code_challenge", codeChallenge);
    mayaLink.searchParams.set("account", "maya@gableton.dev");

    withCorsHeaders(response);
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(`<!doctype html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:32px;background:#f3f4f6;color:#111827;">
    <div style="max-width:520px;margin:0 auto;padding:32px;background:#fff;border:1px solid #d7d7d7;border-radius:12px;">
      <h1 style="margin-top:0;">Sign in to Gableton</h1>
      <p>Select a development account to continue the desktop OAuth flow.</p>
      <div style="display:grid;gap:12px;margin-top:24px;">
        <a href="${hunterLink.toString()}" style="padding:12px 14px;border-radius:8px;background:#111827;color:#fff;text-decoration:none;">Continue as Hunter Wiley</a>
        <a href="${mayaLink.toString()}" style="padding:12px 14px;border-radius:8px;background:#fff;color:#111827;text-decoration:none;border:1px solid #d7d7d7;">Continue as Maya</a>
      </div>
    </div>
  </body>
</html>`);
    return;
  }

  if (method === "GET" && pathname === "/v1/oauth/approve") {
    const redirectUri = url.searchParams.get("redirect_uri") || "";
    const state = url.searchParams.get("state") || "";
    const codeChallenge = url.searchParams.get("code_challenge") || "";
    const account = url.searchParams.get("account") || "";
    const user = buildUserFromEmail(account);

    if (!redirectUri || !state || !codeChallenge || !user) {
      sendJson(response, 400, { error: "Invalid OAuth approval request." });
      return;
    }

    const redirectTarget = new URL(redirectUri);
    redirectTarget.searchParams.set("code", beginAuthorizationCode(user, redirectUri, codeChallenge));
    redirectTarget.searchParams.set("state", state);
    response.writeHead(302, { Location: redirectTarget.toString() });
    response.end();
    return;
  }

  if (method === "POST" && pathname === "/v1/oauth/token") {
    const body = await readJson(request);
    if (body.grant_type !== "authorization_code") {
      sendJson(response, 400, { error: "Unsupported OAuth grant type." });
      return;
    }

    const code = typeof body.code === "string" ? body.code : "";
    const redirectUri = typeof body.redirect_uri === "string" ? body.redirect_uri : "";
    const codeVerifier = typeof body.code_verifier === "string" ? body.code_verifier : "";
    const record = authCodes.get(code);

    if (!record || record.redirectUri !== redirectUri) {
      sendJson(response, 400, { error: "OAuth code is invalid." });
      return;
    }

    if (createPkceChallenge(codeVerifier) !== record.codeChallenge) {
      sendJson(response, 400, { error: "PKCE verification failed." });
      return;
    }

    authCodes.delete(code);
    sendSession(response, issueSession(record.user));
    return;
  }

  if (method === "POST" && pathname === "/v1/auth/login") {
    const body = await readJson(request);
    const user = resolveLoginUser(body.email, body.password);
    if (!user) {
      sendJson(response, 401, { error: "Invalid email or password." });
      return;
    }
    sendSession(response, issueSession(user));
    return;
  }

  if (method === "POST" && pathname === "/v1/auth/refresh") {
    const body = await readJson(request);
    const refreshToken = typeof body.refresh_token === "string" ? body.refresh_token : "";
    const record = refreshSessions.get(refreshToken);
    if (!record) {
      sendJson(response, 401, { error: "Refresh token is invalid." });
      return;
    }
    sendSession(response, issueSession(record.user, refreshToken));
    return;
  }

  if (method === "POST" && pathname === "/v1/auth/logout") {
    const body = await readJson(request);
    const refreshToken = typeof body.refresh_token === "string" ? body.refresh_token : "";
    refreshSessions.delete(refreshToken);
    for (const [accessToken, session] of accessSessions.entries()) {
      if (session.refreshToken === refreshToken) {
        accessSessions.delete(accessToken);
      }
    }
    sendJson(response, 200, { status: "signed_out" });
    return;
  }

  if (method === "GET" && pathname === "/v1/repos") {
    const authSession = getAuthSession(request, response);
    if (!authSession) {
      return;
    }
    sendJson(response, 200, {
      repos: Array.from(repos.values()).map((repo) => ({
        id: repo.id,
        name: repo.name,
        default_branch: repo.defaultBranch
      }))
    });
    return;
  }

  let params = matchPath(pathname, "/v1/repos/:repoId/versions");
  if (method === "GET" && params) {
    const authSession = getAuthSession(request, response);
    if (!authSession) {
      return;
    }
    const repo = getRepo(params.repoId, response);
    if (!repo) {
      return;
    }
    sendJson(response, 200, {
      versions: repo.versions.map((version) => ({
        id: version.id,
        title: version.title,
        author: version.author,
        created_at: version.createdAt,
        state: version.state,
        summary: version.summary
      }))
    });
    return;
  }

  params = matchPath(pathname, "/v1/repos/:repoId/pull-requests");
  if (method === "GET" && params) {
    const authSession = getAuthSession(request, response);
    if (!authSession) {
      return;
    }
    const repo = getRepo(params.repoId, response);
    if (!repo) {
      return;
    }
    sendJson(response, 200, { pull_requests: repo.pullRequests });
    return;
  }

  params = matchPath(pathname, "/v1/repos/:repoId/objects/existence");
  if (method === "POST" && params) {
    const authSession = getAuthSession(request, response);
    if (!authSession) {
      return;
    }
    const repo = getRepo(params.repoId, response);
    if (!repo) {
      return;
    }
    const body = await readJson(request);
    const chunkHashes = Array.isArray(body.chunk_hashes) ? body.chunk_hashes : [];
    const blobHashes = Array.isArray(body.blob_hashes) ? body.blob_hashes : [];
    const manifestHashes = Array.isArray(body.manifest_hashes) ? body.manifest_hashes : [];
    sendJson(response, 200, {
      missing_chunks: chunkHashes.filter((hash) => !objectStore.has(`chunk:${hash}`)),
      missing_blobs: blobHashes.filter((hash) => !objectStore.has(`blob:${hash}`)),
      missing_manifests: manifestHashes.filter((hash) => !objectStore.has(`manifest:${hash}`))
    });
    return;
  }

  params = matchPath(pathname, "/v1/repos/:repoId/uploads/sign");
  if (method === "POST" && params) {
    const authSession = getAuthSession(request, response);
    if (!authSession) {
      return;
    }
    const repo = getRepo(params.repoId, response);
    if (!repo) {
      return;
    }
    const body = await readJson(request);
    const objects = Array.isArray(body.objects) ? body.objects : [];
    sendJson(response, 200, {
      uploads: objects.map((item) => ({
        hash: item.hash,
        object_type: item.object_type,
        method: "PUT",
        url: `${ORIGIN}/v1/storage/${encodeURIComponent(item.object_type)}/${encodeURIComponent(item.hash)}`
      }))
    });
    return;
  }

  params = matchPath(pathname, "/v1/storage/:objectType/:hash");
  if (method === "PUT" && params) {
    const buffer = await readBuffer(request);
    objectStore.set(`${params.objectType}:${params.hash}`, buffer);
    sendText(response, 200, "ok", "text/plain; charset=utf-8");
    return;
  }

  if (method === "GET" && params) {
    const buffer = objectStore.get(`${params.objectType}:${params.hash}`);
    if (!buffer) {
      sendJson(response, 404, { error: "Object not found" });
      return;
    }
    sendText(response, 200, buffer);
    return;
  }

  params = matchPath(pathname, "/v1/repos/:repoId/commits/stage");
  if (method === "POST" && params) {
    const authSession = getAuthSession(request, response);
    if (!authSession) {
      return;
    }
    const repo = getRepo(params.repoId, response);
    if (!repo) {
      return;
    }
    const body = await readJson(request);
    const stagedCommitToken = `staged_${randomUUID()}`;
    repo.stagedCommits.set(stagedCommitToken, {
      refName: body.ref_name || "main",
      parentCommitId: body.parent_commit_id || repo.refHeads.main,
      expectedRefHead: body.expected_ref_head || repo.refHeads.main,
      commitHash: body.commit_hash,
      manifestHash: body.manifest_hash
    });
    sendJson(response, 200, { staged_commit_token: stagedCommitToken });
    return;
  }

  params = matchPath(pathname, "/v1/repos/:repoId/commits/finalize");
  if (method === "POST" && params) {
    const authSession = getAuthSession(request, response);
    if (!authSession) {
      return;
    }
    const repo = getRepo(params.repoId, response);
    if (!repo) {
      return;
    }
    const body = await readJson(request);
    const stage = repo.stagedCommits.get(body.staged_commit_token);
    if (!stage) {
      sendJson(response, 400, { error: "Unknown staged commit token" });
      return;
    }

    const manifestPayload = body.manifest_payload;
    const manifest = {
      version: Number(manifestPayload?.version || 1),
      repoFormat: typeof manifestPayload?.repoFormat === "string" ? manifestPayload.repoFormat : "gableton-phase1",
      files: Array.isArray(manifestPayload?.files)
        ? manifestPayload.files.map((file) => ({
            path: typeof file.path === "string" ? file.path : "",
            blobHash: typeof file.blobHash === "string" ? file.blobHash : ""
          }))
        : []
    };

    const commitPayload = body.commit_payload || {};
    const commitId = `commit_${commitCounter += 1}`;
    repo.commits.set(commitId, { manifest, createdAt: isoNow() });
    repo.refHeads[stage.refName] = commitId;
    repo.versions.unshift({
      id: commitId,
      title: typeof commitPayload.message === "string" ? commitPayload.message : "Untitled publish",
      author: authSession.user.displayName,
      createdAt: typeof commitPayload.createdClientAt === "string" ? commitPayload.createdClientAt : isoNow(),
      state: "published",
      summary: "Published through local Phase 1 API"
    });

    sendJson(response, 200, {
      commit_id: commitId,
      manifest_hash: typeof commitPayload.manifestHash === "string" ? commitPayload.manifestHash : stage.manifestHash,
      ref_name: stage.refName,
      ref_head: commitId
    });
    return;
  }

  params = matchPath(pathname, "/v1/repos/:repoId/pull-requests");
  if (method === "POST" && params) {
    const authSession = getAuthSession(request, response);
    if (!authSession) {
      return;
    }
    const repo = getRepo(params.repoId, response);
    if (!repo) {
      return;
    }
    const body = await readJson(request);
    const record = {
      id: `cr_${changeRequestCounter += 1}`,
      title: typeof body.title === "string" ? body.title : "Untitled change request",
      author: authSession.user.displayName,
      created_by: authSession.user.displayName,
      status: "open",
      approvals: 0
    };
    repo.pullRequests.unshift(record);
    sendJson(response, 201, record);
    return;
  }

  params = matchPath(pathname, "/v1/repos/:repoId/commits/:commitId/manifest");
  if (method === "GET" && params) {
    const authSession = getAuthSession(request, response);
    if (!authSession) {
      return;
    }
    const repo = getRepo(params.repoId, response);
    if (!repo) {
      return;
    }
    const commit = repo.commits.get(params.commitId);
    if (!commit) {
      sendJson(response, 404, { error: `Unknown commit ${params.commitId}` });
      return;
    }
    sendJson(response, 200, serializeManifest(commit.manifest));
    return;
  }

  params = matchPath(pathname, "/v1/repos/:repoId/downloads/sign");
  if (method === "POST" && params) {
    const authSession = getAuthSession(request, response);
    if (!authSession) {
      return;
    }
    const repo = getRepo(params.repoId, response);
    if (!repo) {
      return;
    }
    const body = await readJson(request);
    const objects = Array.isArray(body.objects) ? body.objects : [];
    sendJson(response, 200, {
      downloads: objects.map((item) => ({
        hash: item.hash,
        object_type: item.object_type,
        method: "GET",
        url: `${ORIGIN}/v1/storage/${encodeURIComponent(item.object_type)}/${encodeURIComponent(item.hash)}`
      }))
    });
    return;
  }

  sendJson(response, 404, { error: `No route for ${method} ${pathname}` });
});

server.listen(PORT, HOST, () => {
  console.log(`Gableton dev API listening at ${ORIGIN}`);
});
