begin;

drop index if exists idx_audit_events_repo_created_at;
drop index if exists idx_pull_requests_repo_target_ref;
drop index if exists idx_pull_requests_repo_status;
drop index if exists idx_manifests_repo_created_at;
drop index if exists idx_commit_parents_parent;
drop index if exists idx_commits_repo_created_at;

drop table if exists audit_events;
drop table if exists pull_request_approvals;
drop table if exists pull_requests;
drop table if exists refs;
drop table if exists commit_parents;
drop table if exists commits;
drop table if exists blob_chunks;
drop table if exists blobs;
drop table if exists chunks;
drop table if exists manifests;
drop table if exists repo_members;
drop table if exists repos;

commit;
