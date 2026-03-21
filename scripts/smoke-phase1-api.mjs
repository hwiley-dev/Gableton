import { createHash } from "node:crypto";

const baseUrl = process.env.GABLETON_API_BASE_URL || "http://127.0.0.1:8788";
const repoId = process.env.GABLETON_REPO_ID || "project_neon_horizon";
const redirectUri = "http://127.0.0.1:65535/oauth/callback";

function toBase64Url(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createPkcePair() {
  const verifier = "smoke_verifier_1234567890";
  const challenge = toBase64Url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = text;
  }

  if (!response.ok) {
    throw new Error(`Request failed: ${init.method || "GET"} ${path} -> ${response.status} ${text}`);
  }

  return payload;
}

async function main() {
  const health = await request("/health");
  if (health.status !== "ok") {
    throw new Error("Health endpoint did not return ok status.");
  }

  const pkce = createPkcePair();
  const authorizeResponse = await fetch(
    `${baseUrl}/v1/oauth/authorize?response_type=code&client_id=gableton-desktop&redirect_uri=${encodeURIComponent(redirectUri)}&state=smoke_state&code_challenge=${encodeURIComponent(pkce.challenge)}&code_challenge_method=S256&login_hint=${encodeURIComponent("hunter@gableton.dev")}`,
    { redirect: "manual" }
  );
  const redirectLocation = authorizeResponse.headers.get("location");
  if (!redirectLocation) {
    throw new Error("OAuth authorize endpoint did not return a redirect.");
  }
  const authorizeUrl = new URL(redirectLocation);
  const code = authorizeUrl.searchParams.get("code");
  const state = authorizeUrl.searchParams.get("state");
  if (!code || state !== "smoke_state") {
    throw new Error("OAuth authorize response did not include a valid code/state.");
  }

  const login = await request("/v1/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: pkce.verifier,
      client_id: "gableton-desktop"
    })
  });
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${login.access_token}`
  };

  const blobHash = "sha256:smoke_blob";
  const manifestHash = "sha256:smoke_manifest";

  const existence = await request(`/v1/repos/${repoId}/objects/existence`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      chunk_hashes: [],
      blob_hashes: [blobHash],
      manifest_hashes: [manifestHash]
    })
  });

  const signedUploads = await request(`/v1/repos/${repoId}/uploads/sign`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      objects: [
        { hash: blobHash, object_type: "blob", size_bytes: 128 },
        { hash: manifestHash, object_type: "manifest", size_bytes: 128 }
      ]
    })
  });

  for (const upload of signedUploads.uploads) {
    const uploadResponse = await fetch(upload.url, {
      method: upload.method,
      headers: { "Content-Type": "application/octet-stream", ...(upload.headers || {}) },
      body: `${upload.object_type}:${upload.hash}`
    });
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed for ${upload.hash}.`);
    }
  }

  const staged = await request(`/v1/repos/${repoId}/commits/stage`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      ref_name: "main",
      parent_commit_id: "commit:base",
      expected_ref_head: "commit:remote",
      commit_hash: "sha256:smoke_commit",
      manifest_hash: manifestHash
    })
  });

  const finalized = await request(`/v1/repos/${repoId}/commits/finalize`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      staged_commit_token: staged.staged_commit_token,
      commit_payload: {
        version: 1,
        repoId,
        parentCommitIds: ["commit:base"],
        authorUserId: "smoke_user",
        authorDisplay: "Smoke Test",
        message: "Smoke publish",
        manifestHash: manifestHash,
        createdClientAt: new Date().toISOString(),
        tooling: {
          clientVersion: "0.1.0",
          abletonVersion: "11.2.11"
        }
      },
      manifest_payload: {
        version: 1,
        repoFormat: "gableton-phase1",
        files: [
          {
            path: "Live Set/Main.als",
            blobHash
          }
        ]
      }
    })
  });

  const pullRequest = await request(`/v1/repos/${repoId}/pull-requests`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      source_ref: "main",
      target_ref: "main",
      title: "Smoke publish",
      description: "Smoke test change request"
    })
  });

  const manifest = await request(`/v1/repos/${repoId}/commits/${finalized.commit_id}/manifest`, {
    headers: { Authorization: `Bearer ${login.access_token}` }
  });
  const signedDownloads = await request(`/v1/repos/${repoId}/downloads/sign`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      objects: manifest.files.map((file) => ({ hash: file.blob_hash, object_type: "blob" }))
    })
  });

  for (const download of signedDownloads.downloads) {
    const downloadResponse = await fetch(download.url, { method: download.method, headers: download.headers || {} });
    if (!downloadResponse.ok) {
      throw new Error(`Download failed for ${download.hash}.`);
    }
  }

  const versions = await request(`/v1/repos/${repoId}/versions`, {
    headers: { Authorization: `Bearer ${login.access_token}` }
  });
  const pullRequests = await request(`/v1/repos/${repoId}/pull-requests`, {
    headers: { Authorization: `Bearer ${login.access_token}` }
  });
  const refreshed = await request("/v1/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: login.refresh_token })
  });
  await request("/v1/auth/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: login.refresh_token })
  });

  console.log(
    JSON.stringify(
      {
        health,
        login: {
          user: login.user,
          expires_at: login.expires_at
        },
        refreshed: {
          user: refreshed.user,
          expires_at: refreshed.expires_at
        },
        existence,
        finalized,
        pullRequest,
        manifest,
        versionCount: versions.versions.length,
        pullRequestCount: pullRequests.pull_requests.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
