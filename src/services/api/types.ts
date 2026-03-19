export interface RepoRecord {
  id: string;
  name: string;
  defaultBranch: string;
}

export interface VersionRecord {
  id: string;
  title: string;
  author: string;
  createdAt: string;
  state: "saved_locally" | "published" | "merged";
  summary: string;
}

export interface ChangeRequestRecord {
  id: string;
  title: string;
  author: string;
  status: "open" | "merged" | "closed";
  approvals: number;
}

export interface ManifestFileRecord {
  path: string;
  blobHash: string;
}

export interface ManifestRecord {
  version: number;
  repoFormat: string;
  files: ManifestFileRecord[];
}

export interface ObjectExistenceRequest {
  chunkHashes: string[];
  blobHashes: string[];
  manifestHashes: string[];
}

export interface ObjectExistenceResponse {
  missingChunks: string[];
  missingBlobs: string[];
  missingManifests: string[];
}

export interface UploadObjectRequest {
  hash: string;
  objectType: "chunk" | "blob" | "manifest";
  sizeBytes: number;
}

export interface SignedObjectUrl {
  hash: string;
  objectType: "chunk" | "blob" | "manifest";
  method: "PUT" | "GET";
  url: string;
  headers?: Record<string, string>;
}

export interface SignUploadsRequest {
  objects: UploadObjectRequest[];
}

export interface SignUploadsResponse {
  uploads: SignedObjectUrl[];
}

export interface StageCommitRequest {
  refName: string;
  parentCommitId: string;
  expectedRefHead: string;
  commitHash: string;
  manifestHash: string;
}

export interface StageCommitResponse {
  stagedCommitToken: string;
}

export interface CommitPayloadRecord {
  version: number;
  repoId: string;
  parentCommitIds: string[];
  authorUserId: string;
  authorDisplay: string;
  message: string;
  manifestHash: string;
  createdClientAt: string;
  tooling: {
    clientVersion: string;
    abletonVersion: string;
  };
}

export interface FinalizeCommitRequest {
  stagedCommitToken: string;
  commitPayload: CommitPayloadRecord;
  manifestPayload: ManifestRecord;
}

export interface FinalizeCommitResponse {
  commitId: string;
  manifestHash: string;
  refName: string;
  refHead: string;
}

export interface CreatePullRequestRequest {
  sourceRef: string;
  targetRef: string;
  title: string;
  description: string;
}

export interface DownloadObjectRequest {
  hash: string;
  objectType: "chunk" | "blob" | "manifest";
}

export interface SignDownloadsRequest {
  objects: DownloadObjectRequest[];
}

export interface SignDownloadsResponse {
  downloads: SignedObjectUrl[];
}

export interface ApiClient {
  listProjects(): Promise<RepoRecord[]>;
  listVersions(projectId: string): Promise<VersionRecord[]>;
  listChangeRequests(projectId: string): Promise<ChangeRequestRecord[]>;
  checkObjectExistence(
    repoId: string,
    request: ObjectExistenceRequest
  ): Promise<ObjectExistenceResponse>;
  signUploads(repoId: string, request: SignUploadsRequest): Promise<SignUploadsResponse>;
  stageCommit(repoId: string, request: StageCommitRequest): Promise<StageCommitResponse>;
  finalizeCommit(repoId: string, request: FinalizeCommitRequest): Promise<FinalizeCommitResponse>;
  createPullRequest(repoId: string, request: CreatePullRequestRequest): Promise<ChangeRequestRecord>;
  getCommitManifest(repoId: string, commitId: string): Promise<ManifestRecord>;
  signDownloads(repoId: string, request: SignDownloadsRequest): Promise<SignDownloadsResponse>;
}
