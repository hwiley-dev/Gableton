# Gableton Phase 0 -> Phase 1 Migration Spec

**Date:** February 23, 2026  
**Status:** Draft (implementation-ready)  
**Audience:** Product, client engineering, backend engineering, infra, QA

## 1. Objective

Migrate from a GitDaw-style workflow (manual `.als <-> .json` conversion + Git LFS) to a native Gableton repository platform with:

- permissioned collaboration
- first-class commit metadata
- deduplicated media storage
- branch/PR workflows for music projects
- deterministic project diffs and better merge handling

The migration must preserve existing user project history and keep an escape hatch to plain Git workflows.

## 2. Scope

### In scope (Phase 1)

- Repo import from existing GitDaw-compatible projects.
- Native object model for commits/manifests/blobs/chunks/refs.
- Desktop client for commit/push/pull/checkout.
- API service with auth, ACLs, commit validation, PR flow.
- Object store integration with hash-addressed immutable objects.
- Fast-forward merge and guarded manual conflict handling.
- Basic semantic diff summaries for Ableton projects.

### Out of scope (Phase 1)

- Realtime multi-user session editing.
- Full semantic auto-merge for all Ableton structures.
- Plugin binary portability/packaging.
- Cross-DAW support.

## 3. Baseline vs Target

### Phase 0 baseline (GitDaw-style)

- `.als` is converted to JSON and committed in Git.
- Large media files are tracked via Git LFS.
- Collaboration is governed only by Git host permissions and PR rules.
- Diff quality depends on raw JSON stability.
- No dedicated server model for DAW semantics.

### Phase 1 target (Gableton native)

- Metadata plane: repos, refs, commits, PRs, ACLs in API + Postgres.
- State plane: canonical set manifest plus `.als` fingerprints per commit.
- Blob plane: content-addressed chunk store with dedup + selective download.
- Client-managed staging/pack/upload and server-side validation/finalization.

## 4. Design Principles

1. **Determinism first**: same logical set state must produce same canonical hash.
2. **Content-addressed immutability**: objects are immutable once stored.
3. **Minimal upload**: upload only missing chunks/blobs.
4. **Incremental migration**: import existing projects without requiring history rewrite.
5. **User safety**: no silent auto-merge on uncertain musical conflicts.
6. **Git interoperability**: export/import bridge remains available.

## 5. Potentiators Included in This Spec

1. ALS/JSON adapter retained as bootstrap compatibility layer.
2. Canonicalization pipeline for stable diffs and hashes.
3. Semantic summaries (tracks, clips, automation, routing changes).
4. Manifest object per commit for precise reproducibility.
5. Chunk-level dedup with rolling hash boundaries.
6. Local cache and partial checkout for performance/cost.
7. Plugin and sample fingerprint capture for diagnostics.
8. Protected branches + required approvals.
9. Optional track locks/edit claims to reduce conflicts.
10. Full hash verification on checkout.
11. GitDaw import tool and reverse export path.
12. Telemetry for conflict/cost hot spots.
13. Proxy audio/previews for low-bandwidth review (optional in 1.1).
14. Policy hooks for licensing and content compliance metadata.
15. Future skill/automation hooks for repository checks.

## 6. Phase 1 Architecture

### 6.1 Components

- **Desktop client (required)**:
  - folder watcher
  - scan/hash/chunk packer
  - existence check + upload coordinator
  - checkout engine
  - conflict UI launcher
- **API service**:
  - authn/authz
  - object negotiation (what exists vs missing)
  - commit finalization
  - refs and PR orchestration
- **Postgres**:
  - transactional source of truth for metadata
- **Object storage (S3-compatible)**:
  - immutable blobs/chunks addressed by hash
- **Worker service**:
  - diff summaries
  - GC candidate marking
  - optional proxy render jobs

### 6.2 Planes

- **Metadata plane**: repo, users, ACL, commit DAG, refs, PR state.
- **State plane**: canonicalized Ableton state manifest and file index.
- **Blob plane**: chunked binary objects referenced by manifests.

## 7. Canonical Object Model

### 7.1 IDs and hashes

- `algo`: `sha256` (Phase 1 default)
- `object_id`: `<type>:<sha256_hex>`
- hash scope:
  - chunk hash over raw chunk bytes
  - blob hash over full file bytes
  - manifest hash over canonical JSON serialization
  - commit hash over canonical commit payload (excluding server timestamps)

### 7.2 Manifest schema (canonical JSON)

```json
{
  "version": 1,
  "repo_format": "gableton-phase1",
  "files": [
    {
      "path": "Ableton Project/Live Set/Main.als",
      "kind": "als",
      "size": 81699,
      "blob_hash": "sha256:...",
      "canonical_hash": "sha256:...",
      "volatile_fields_removed": [
        "Ableton.LiveSet.OverwriteProtectionNumber",
        "Ableton._attributes.Revision"
      ]
    },
    {
      "path": "Samples/Kick.wav",
      "kind": "audio",
      "size": 23881234,
      "blob_hash": "sha256:...",
      "chunks": [
        "sha256:chunk1",
        "sha256:chunk2"
      ],
      "codec": "wav"
    }
  ],
  "plugin_fingerprints": [
    {
      "name": "Operator",
      "vendor": "Ableton",
      "version": "11.2.11"
    }
  ],
  "sample_references": [
    {
      "path": "Samples/Kick.wav",
      "licensed": "unknown"
    }
  ]
}
```

### 7.3 Commit schema (canonical JSON)

```json
{
  "version": 1,
  "repo_id": "repo_123",
  "parent_commit_ids": ["commit:sha256:..."],
  "author_user_id": "user_abc",
  "author_display": "Jane Producer",
  "message": "Add bassline and sidechain automation",
  "manifest_hash": "sha256:...",
  "created_client_at": "2026-02-23T18:41:03Z",
  "tooling": {
    "client_version": "0.1.0",
    "ableton_version": "11.2.11"
  }
}
```

## 8. Postgres Schema (minimum viable)

```sql
create table repos (
  id text primary key,
  name text not null,
  owner_user_id text not null,
  default_branch text not null default 'main',
  created_at timestamptz not null default now()
);

create table repo_members (
  repo_id text not null references repos(id),
  user_id text not null,
  role text not null check (role in ('owner','maintainer','contributor','viewer')),
  primary key (repo_id, user_id)
);

create table commits (
  id text primary key,
  repo_id text not null references repos(id),
  manifest_hash text not null,
  author_user_id text not null,
  message text not null,
  created_client_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table commit_parents (
  commit_id text not null references commits(id),
  parent_commit_id text not null references commits(id),
  primary key (commit_id, parent_commit_id)
);

create table refs (
  repo_id text not null references repos(id),
  name text not null,
  commit_id text not null references commits(id),
  updated_at timestamptz not null default now(),
  primary key (repo_id, name)
);

create table manifests (
  hash text primary key,
  repo_id text not null references repos(id),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table blobs (
  hash text primary key,
  size_bytes bigint not null,
  storage_key text not null,
  created_at timestamptz not null default now()
);

create table blob_chunks (
  blob_hash text not null references blobs(hash),
  chunk_hash text not null,
  ord int not null,
  primary key (blob_hash, ord)
);

create table chunks (
  hash text primary key,
  size_bytes int not null,
  storage_key text not null,
  ref_count bigint not null default 0,
  created_at timestamptz not null default now()
);

create table pull_requests (
  id text primary key,
  repo_id text not null references repos(id),
  source_ref text not null,
  target_ref text not null,
  title text not null,
  description text not null default '',
  status text not null check (status in ('open','merged','closed')),
  created_by text not null,
  created_at timestamptz not null default now()
);
```

## 9. Storage Layout (object store)

- `chunks/sha256/ab/cd/<fullhash>`
- `blobs/sha256/ab/cd/<fullhash>`
- `manifests/sha256/ab/cd/<fullhash>.json`
- optional:
  - `previews/<repo>/<commit>/<path>.ogg`
  - `waveforms/<repo>/<commit>/<path>.json`

## 10. API Contract (Phase 1)

### 10.1 Auth and repo management

- `POST /v1/repos` -> create repo
- `GET /v1/repos/:repoId` -> repo metadata
- `POST /v1/repos/:repoId/members` -> invite/set role

### 10.2 Object negotiation

- `POST /v1/repos/:repoId/objects/existence`
  - request: `{ "chunk_hashes": [], "blob_hashes": [], "manifest_hashes": [] }`
  - response: `{ "missing_chunks": [], "missing_blobs": [], "missing_manifests": [] }`

- `POST /v1/repos/:repoId/uploads/sign`
  - request list of object hashes + sizes
  - response pre-signed PUT URLs

### 10.3 Commit flow

- `POST /v1/repos/:repoId/commits/stage`
  - validates parent, ACL, and object existence
  - returns `staged_commit_token`

- `POST /v1/repos/:repoId/commits/finalize`
  - request includes `staged_commit_token`, commit payload, manifest payload
  - server recalculates hashes and writes transactionally
  - response includes `commit_id`

- `POST /v1/repos/:repoId/refs/:refName/move`
  - optimistic move with expected old head
  - supports fast-forward check

### 10.4 PR flow

- `POST /v1/repos/:repoId/pull-requests`
- `POST /v1/repos/:repoId/pull-requests/:id/approve`
- `POST /v1/repos/:repoId/pull-requests/:id/merge`

### 10.5 Checkout and sync

- `GET /v1/repos/:repoId/commits/:commitId/manifest`
- `POST /v1/repos/:repoId/downloads/sign` for missing objects

## 11. Client Migration and Sync Algorithms

### 11.1 Import existing GitDaw repo

1. Detect GitDaw signature:
   - `.gitattributes` contains LFS media patterns.
   - project has `.als` and/or converted JSON snapshots.
2. Enumerate git commits on selected branch.
3. For each commit:
   - materialize working tree
   - generate canonical manifest
   - upload missing chunks/blobs/manifests
   - create mapped Gableton commit with `source_git_commit` metadata
4. Create refs (`main`, feature branches).
5. Verify tip commit digest parity against manifest hash.

### 11.2 Canonicalization pipeline

1. Read `.als` bytes.
2. Decompress gzip.
3. Parse XML -> JSON AST.
4. Remove known volatile fields:
   - revision strings
   - overwrite protection counters
   - non-semantic transient IDs where safe
5. Sort object keys and normalize arrays where ordering is non-semantic.
6. Serialize canonical JSON.
7. Hash canonical JSON as `canonical_hash`.

### 11.3 Chunking strategy

- Start with fixed chunks (4 MiB) for implementation simplicity.
- Feature-flag rolling chunks (FastCDC) after correctness baseline.
- Always hash full file as blob hash.
- Reconstruct full file from ordered chunk list on checkout.

## 12. Merge and Conflict Behavior (MVP)

- `main` is protected by default.
- merges allowed:
  - fast-forward
  - no-conflict 3-way (same object unchanged on one side)
- conflict classes:
  - manifest path conflicts
  - ALS semantic region conflicts
  - plugin fingerprint incompatibility warnings
- on conflict:
  - block server merge
  - client opens conflict summary with actions:
    - keep ours
    - keep theirs
    - open Ableton and recommit resolved state

## 13. Permissions and Policy

Roles:

- `owner`: admin, branch protection, destructive policy ops
- `maintainer`: merge PRs, manage contributors
- `contributor`: push to non-protected branches, open PRs
- `viewer`: read-only

Policy toggles:

- require PR approvals on protected branches
- require linear history
- require passing checks (optional in Phase 1.1)

## 14. Cost and Performance Targets

Initial targets for first 50 active repos:

- median push (small metadata-only change): < 3 seconds
- median push (single new 50 MB stem): < 15 seconds on broadband
- storage dedup gain: >= 35% on repeated stems/samples
- p95 checkout of known commit with warm cache: < 10 seconds

Cost controls:

- chunk dedup
- local client cache (LRU size cap)
- partial checkout (only needed paths)
- GC unreferenced objects after 14-day grace
- optional preview generation to avoid full-audio downloads for review

## 15. Observability and Audit

Metrics:

- upload bytes logical vs physical
- dedup ratio by repo
- merge conflict rate and hotspots
- checkout hash verification failures
- egress per active user and per repo

Audit log events:

- commit finalized
- ref moved
- PR approved/merged
- role changed
- policy changed

## 16. Testing Strategy

- unit:
  - canonicalization determinism
  - hash computation
  - chunk reconstruction
- integration:
  - end-to-end commit/finalize/ref move
  - conflict detection paths
  - permissions checks
- compatibility:
  - import GitDaw sample repos
  - cross-machine checkout parity
- reliability:
  - interrupted upload resume
  - object-store transient failure retries

## 17. Rollout Plan and Gates

### 17.1 Milestone A: Internal alpha (2-3 weeks)

- single-tenant backend in staging
- client supports init/commit/push/pull/checkout
- one-way import from GitDaw
- **Exit gate:** 0 data-loss bugs on 20 seeded projects

### 17.2 Milestone B: Private beta (3-4 weeks)

- PR approvals + protected branches
- conflict UX v1
- observability dashboards
- **Exit gate:** p95 push and checkout targets met for beta cohort

### 17.3 Milestone C: Public MVP (2-3 weeks)

- hardened import tool
- backup/restore runbooks
- billing guardrails on storage + egress
- **Exit gate:** support readiness and incident playbooks complete

## 18. Migration Runbook (Per Repository)

1. Freeze branch protection changes temporarily.
2. Snapshot Git refs and LFS object inventory.
3. Run import CLI in dry-run mode and inspect report.
4. Run import CLI in execute mode.
5. Verify:
   - ref head parity
   - random commit checkout parity hash
   - Ableton open test on tip
6. Enable branch protections and PR policy in Gableton.
7. Announce cutover and keep Git read-only mirror for 2-4 weeks.

## 19. Risks and Mitigations

- **Risk:** false semantic conflicts from unstable ALS fields.  
  **Mitigation:** strict canonicalization fixture suite and allowlist/denylist per Ableton version.

- **Risk:** object-store egress spikes.  
  **Mitigation:** mandatory client cache, partial checkout default, preview audio for review path.

- **Risk:** plugin mismatch breaks reproducibility.  
  **Mitigation:** fingerprint capture + preflight warnings and policy checks.

- **Risk:** import duration for large history.  
  **Mitigation:** parallel object upload, resumable checkpoints, branch-by-branch import.

## 20. Open Questions

1. Which Ableton versions are officially supported at launch?
2. Do we enforce signed commits in Phase 1 or defer to Phase 2?
3. What is the initial max repo size and per-file upload cap?
4. Should preview/audio proxy generation be MVP or Phase 1.1?
5. What default branch protection policy applies to newly created repos?

## 21. Immediate Implementation Backlog

1. Build canonicalization library with fixture corpus (`ableton_11_x`).
2. Implement object negotiation endpoints and storage adapter.
3. Implement commit stage/finalize transaction boundaries.
4. Implement desktop uploader/checkout engine with local cache.
5. Implement GitDaw import CLI with dry-run and resumable checkpoints.
6. Add PR/approval endpoints and branch protection checks.
7. Add conflict summary generator and client UI integration.
8. Add telemetry pipeline for dedup/conflict/egress metrics.
