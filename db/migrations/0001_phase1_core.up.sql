begin;

create table repos (
  id text primary key,
  name text not null check (char_length(name) > 0),
  owner_user_id text not null,
  default_branch text not null default 'main',
  created_at timestamptz not null default now()
);

create table repo_members (
  repo_id text not null references repos(id) on delete cascade,
  user_id text not null,
  role text not null check (role in ('owner', 'maintainer', 'contributor', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (repo_id, user_id)
);

create table manifests (
  hash text primary key,
  repo_id text not null references repos(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table chunks (
  hash text primary key,
  size_bytes bigint not null check (size_bytes >= 0),
  storage_key text not null unique,
  ref_count bigint not null default 0 check (ref_count >= 0),
  created_at timestamptz not null default now()
);

create table blobs (
  hash text primary key,
  size_bytes bigint not null check (size_bytes >= 0),
  storage_key text not null unique,
  created_at timestamptz not null default now()
);

create table blob_chunks (
  blob_hash text not null references blobs(hash) on delete cascade,
  chunk_hash text not null references chunks(hash),
  ord int not null check (ord >= 0),
  primary key (blob_hash, ord)
);

create table commits (
  id text primary key,
  repo_id text not null references repos(id) on delete cascade,
  manifest_hash text not null references manifests(hash),
  author_user_id text not null,
  author_display text not null,
  message text not null,
  created_client_at timestamptz not null,
  created_at timestamptz not null default now(),
  payload jsonb not null
);

create table commit_parents (
  commit_id text not null references commits(id) on delete cascade,
  parent_commit_id text not null references commits(id),
  primary key (commit_id, parent_commit_id)
);

create table refs (
  repo_id text not null references repos(id) on delete cascade,
  name text not null,
  commit_id text not null references commits(id),
  updated_at timestamptz not null default now(),
  primary key (repo_id, name)
);

create table pull_requests (
  id text primary key,
  repo_id text not null references repos(id) on delete cascade,
  source_ref text not null,
  target_ref text not null,
  title text not null,
  description text not null default '',
  status text not null check (status in ('open', 'merged', 'closed')),
  created_by text not null,
  created_at timestamptz not null default now(),
  merged_at timestamptz
);

create table pull_request_approvals (
  pull_request_id text not null references pull_requests(id) on delete cascade,
  approved_by text not null,
  comment text not null default '',
  approved_at timestamptz not null default now(),
  primary key (pull_request_id, approved_by)
);

create table audit_events (
  id bigserial primary key,
  repo_id text not null references repos(id) on delete cascade,
  event_type text not null,
  actor_user_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_commits_repo_created_at on commits(repo_id, created_at desc);
create index idx_commit_parents_parent on commit_parents(parent_commit_id);
create index idx_manifests_repo_created_at on manifests(repo_id, created_at desc);
create index idx_pull_requests_repo_status on pull_requests(repo_id, status);
create index idx_pull_requests_repo_target_ref on pull_requests(repo_id, target_ref);
create index idx_audit_events_repo_created_at on audit_events(repo_id, created_at desc);

commit;
