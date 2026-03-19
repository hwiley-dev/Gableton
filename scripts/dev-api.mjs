import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.GABLETON_API_PORT || 8788);
const HOST = process.env.GABLETON_API_HOST || "127.0.0.1";
const ORIGIN = `http://${HOST}:${PORT}`;

const objectStore = new Map();
let commitCounter = 1;
let changeRequestCounter = 1;

function isoNow() {
  return new Date().toISOString();
}

function makeHash(seed) {
  return `sha256:${seed.replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase()}`;
}

function manifestForRepo(repoId) {
  return {
    version: 1,
    repoFormat: "gableton-phase1",
    files: [
      {
        path: `${repoId}/Live Set/Main.als`,
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

  if (method === "GET" && pathname === "/v1/repos") {
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
    const repo = getRepo(params.repoId, response);
    if (!repo) {
      return;
    }
    sendJson(response, 200, { pull_requests: repo.pullRequests });
    return;
  }

  params = matchPath(pathname, "/v1/repos/:repoId/objects/existence");
  if (method === "POST" && params) {
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
      author: typeof commitPayload.authorDisplay === "string" ? commitPayload.authorDisplay : "Current User",
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
    const repo = getRepo(params.repoId, response);
    if (!repo) {
      return;
    }
    const body = await readJson(request);
    const record = {
      id: `cr_${changeRequestCounter += 1}`,
      title: typeof body.title === "string" ? body.title : "Untitled change request",
      author: "Current User",
      status: "open",
      approvals: 0
    };
    repo.pullRequests.unshift(record);
    sendJson(response, 201, record);
    return;
  }

  params = matchPath(pathname, "/v1/repos/:repoId/commits/:commitId/manifest");
  if (method === "GET" && params) {
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
