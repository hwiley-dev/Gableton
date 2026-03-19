import type {
  ApiClient,
  ChangeRequestRecord,
  CreatePullRequestRequest,
  FinalizeCommitRequest,
  FinalizeCommitResponse,
  ManifestRecord,
  ObjectExistenceRequest,
  ObjectExistenceResponse,
  RepoRecord,
  SignDownloadsRequest,
  SignDownloadsResponse,
  SignUploadsRequest,
  SignUploadsResponse,
  StageCommitRequest,
  StageCommitResponse,
  VersionRecord
} from "./types";

interface HttpApiClientOptions {
  baseUrl: string;
  token?: string;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" ? value : fallback;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
}

export class HttpApiClient implements ApiClient {
  constructor(private readonly options: HttpApiClientOptions) {}

  async listProjects(): Promise<RepoRecord[]> {
    return this.get("/v1/repos").then((payload) =>
      asRecordArray(payload.repos).map((item) => ({
        id: asString(item.id),
        name: asString(item.name),
        defaultBranch: asString(item.default_branch || item.defaultBranch, "main")
      }))
    );
  }

  async listVersions(projectId: string): Promise<VersionRecord[]> {
    return this.get(`/v1/repos/${projectId}/versions`).then((payload) =>
      asRecordArray(payload.versions).map((item) => ({
        id: asString(item.id),
        title: asString(item.title),
        author: asString(item.author),
        createdAt: asString(item.created_at || item.createdAt),
        state:
          (asString(item.state) as "saved_locally" | "published" | "merged") || "published",
        summary: asString(item.summary)
      }))
    );
  }

  async listChangeRequests(projectId: string): Promise<ChangeRequestRecord[]> {
    return this.get(`/v1/repos/${projectId}/pull-requests`).then((payload) =>
      asRecordArray(payload.pull_requests || payload.pullRequests).map((item) => ({
        id: asString(item.id),
        title: asString(item.title),
        author: asString(item.author),
        status: (asString(item.status) as "open" | "merged" | "closed") || "open",
        approvals: asNumber(item.approvals)
      }))
    );
  }

  async checkObjectExistence(
    repoId: string,
    request: ObjectExistenceRequest
  ): Promise<ObjectExistenceResponse> {
    return this.post(`/v1/repos/${repoId}/objects/existence`, {
      chunk_hashes: request.chunkHashes,
      blob_hashes: request.blobHashes,
      manifest_hashes: request.manifestHashes
    }).then((payload) => ({
      missingChunks: Array.isArray(payload.missing_chunks)
        ? payload.missing_chunks.map((item) => asString(item))
        : [],
      missingBlobs: Array.isArray(payload.missing_blobs)
        ? payload.missing_blobs.map((item) => asString(item))
        : [],
      missingManifests: Array.isArray(payload.missing_manifests)
        ? payload.missing_manifests.map((item) => asString(item))
        : []
    }));
  }

  async signUploads(repoId: string, request: SignUploadsRequest): Promise<SignUploadsResponse> {
    return this.post(`/v1/repos/${repoId}/uploads/sign`, {
      objects: request.objects.map((item) => ({
        hash: item.hash,
        object_type: item.objectType,
        size_bytes: item.sizeBytes
      }))
    }).then((payload) => ({
      uploads: asRecordArray(payload.uploads).map((item) => ({
        hash: asString(item.hash),
        objectType: (asString(item.object_type || item.objectType) as "chunk" | "blob" | "manifest") || "blob",
        method: (asString(item.method) as "PUT" | "GET") || "PUT",
        url: asString(item.url),
        headers:
          item.headers && typeof item.headers === "object"
            ? Object.fromEntries(
                Object.entries(item.headers).map(([key, value]) => [key, asString(value)])
              )
            : undefined
      }))
    }));
  }

  async stageCommit(repoId: string, request: StageCommitRequest): Promise<StageCommitResponse> {
    return this.post(`/v1/repos/${repoId}/commits/stage`, {
      ref_name: request.refName,
      parent_commit_id: request.parentCommitId,
      expected_ref_head: request.expectedRefHead,
      commit_hash: request.commitHash,
      manifest_hash: request.manifestHash
    }).then((payload) => ({
      stagedCommitToken: asString(payload.staged_commit_token)
    }));
  }

  async finalizeCommit(
    repoId: string,
    request: FinalizeCommitRequest
  ): Promise<FinalizeCommitResponse> {
    return this.post(`/v1/repos/${repoId}/commits/finalize`, {
      staged_commit_token: request.stagedCommitToken,
      commit_payload: request.commitPayload,
      manifest_payload: request.manifestPayload
    }).then((payload) => ({
      commitId: asString(payload.commit_id),
      manifestHash: asString(payload.manifest_hash),
      refName: asString(payload.ref_name),
      refHead: asString(payload.ref_head)
    }));
  }

  async createPullRequest(
    repoId: string,
    request: CreatePullRequestRequest
  ): Promise<ChangeRequestRecord> {
    return this.post(`/v1/repos/${repoId}/pull-requests`, {
      source_ref: request.sourceRef,
      target_ref: request.targetRef,
      title: request.title,
      description: request.description
    }).then((payload) => ({
      id: asString(payload.id),
      title: asString(payload.title),
      author: asString(payload.created_by, "Unknown"),
      status: (asString(payload.status) as "open" | "merged" | "closed") || "open",
      approvals: 0
    }));
  }

  async getCommitManifest(repoId: string, commitId: string): Promise<ManifestRecord> {
    return this.get(`/v1/repos/${repoId}/commits/${commitId}/manifest`).then((payload) => ({
      version: asNumber(payload.version, 1),
      repoFormat: asString(payload.repo_format, "gableton-phase1"),
      files: asRecordArray(payload.files).map((item) => ({
        path: asString(item.path),
        blobHash: asString(item.blob_hash || item.blobHash)
      }))
    }));
  }

  async signDownloads(
    repoId: string,
    request: SignDownloadsRequest
  ): Promise<SignDownloadsResponse> {
    return this.post(`/v1/repos/${repoId}/downloads/sign`, {
      objects: request.objects.map((item) => ({
        hash: item.hash,
        object_type: item.objectType
      }))
    }).then((payload) => ({
      downloads: asRecordArray(payload.downloads).map((item) => ({
        hash: asString(item.hash),
        objectType: (asString(item.object_type || item.objectType) as "chunk" | "blob" | "manifest") || "blob",
        method: (asString(item.method) as "PUT" | "GET") || "GET",
        url: asString(item.url),
        headers:
          item.headers && typeof item.headers === "object"
            ? Object.fromEntries(
                Object.entries(item.headers).map(([key, value]) => [key, asString(value)])
              )
            : undefined
      }))
    }));
  }

  private async get(path: string): Promise<Record<string, unknown>> {
    return this.request(path, { method: "GET" });
  }

  private async post(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.request(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
  }

  private async request(path: string, init: RequestInit): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.options.baseUrl}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        ...(this.options.token ? { Authorization: `Bearer ${this.options.token}` } : {})
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}.`);
    }

    return (await response.json()) as Record<string, unknown>;
  }
}

export class DemoApiClient implements ApiClient {
  private readonly repos: RepoRecord[] = [
    { id: "project_neon_horizon", name: "Neon Horizon", defaultBranch: "main" },
    { id: "project_tape_bloom", name: "Tape Bloom", defaultBranch: "main" }
  ];
  private readonly versions = new Map<string, VersionRecord[]>();
  private readonly changeRequests = new Map<string, ChangeRequestRecord[]>();
  private readonly manifests = new Map<string, ManifestRecord>();
  private prCounter = 1;
  private commitCounter = 1;

  async listProjects(): Promise<RepoRecord[]> {
    return this.repos;
  }

  async listVersions(projectId: string): Promise<VersionRecord[]> {
    return this.versions.get(projectId) ?? [];
  }

  async listChangeRequests(projectId: string): Promise<ChangeRequestRecord[]> {
    return this.changeRequests.get(projectId) ?? [];
  }

  async checkObjectExistence(
    _repoId: string,
    request: ObjectExistenceRequest
  ): Promise<ObjectExistenceResponse> {
    return {
      missingChunks: request.chunkHashes,
      missingBlobs: request.blobHashes,
      missingManifests: request.manifestHashes
    };
  }

  async signUploads(_repoId: string, request: SignUploadsRequest): Promise<SignUploadsResponse> {
    return {
      uploads: request.objects.map((item) => ({
        hash: item.hash,
        objectType: item.objectType,
        method: "PUT",
        url: `demo://${item.objectType}/${item.hash}`
      }))
    };
  }

  async stageCommit(_repoId: string, _request: StageCommitRequest): Promise<StageCommitResponse> {
    return {
      stagedCommitToken: `staged_${this.commitCounter}`
    };
  }

  async finalizeCommit(
    repoId: string,
    request: FinalizeCommitRequest
  ): Promise<FinalizeCommitResponse> {
    const commitId = `commit_${this.commitCounter += 1}`;
    this.manifests.set(commitId, request.manifestPayload);

    const existingVersions = this.versions.get(repoId) ?? [];
    this.versions.set(repoId, [
      {
        id: request.commitPayload.manifestHash,
        title: request.commitPayload.message,
        author: request.commitPayload.authorDisplay,
        createdAt: request.commitPayload.createdClientAt,
        state: "published",
        summary: "Published from demo API client"
      },
      ...existingVersions
    ]);

    return {
      commitId,
      manifestHash: request.commitPayload.manifestHash,
      refName: "main",
      refHead: commitId
    };
  }

  async createPullRequest(
    repoId: string,
    request: CreatePullRequestRequest
  ): Promise<ChangeRequestRecord> {
    const record: ChangeRequestRecord = {
      id: `cr_${this.prCounter += 1}`,
      title: request.title,
      author: "Current User",
      status: "open",
      approvals: 0
    };
    this.changeRequests.set(repoId, [record, ...(this.changeRequests.get(repoId) ?? [])]);
    return record;
  }

  async getCommitManifest(_repoId: string, commitId: string): Promise<ManifestRecord> {
    return (
      this.manifests.get(commitId) ?? {
        version: 1,
        repoFormat: "gableton-phase1",
        files: []
      }
    );
  }

  async signDownloads(
    _repoId: string,
    request: SignDownloadsRequest
  ): Promise<SignDownloadsResponse> {
    return {
      downloads: request.objects.map((item) => ({
        hash: item.hash,
        objectType: item.objectType,
        method: "GET",
        url: `demo://${item.objectType}/${item.hash}`
      }))
    };
  }
}
