#!/usr/bin/env python3
"""Gableton GitDaw import CLI scaffold.

This CLI is intentionally API-light for MVP bootstrapping:
- `dry-run` builds an import plan + checkpoint without mutating remote state.
- `execute` runs a simulated import loop and updates checkpoint status.
- `resume` continues from a prior checkpoint.

Integration points for actual API calls are marked in `import_commit`.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CHECKPOINT_VERSION = 1
DEFAULT_CHECKPOINT_DIR = ".gableton/import-checkpoints"


def iso_now() -> str:
    return datetime.now(tz=timezone.utc).replace(microsecond=0).isoformat()


def run_git(repo_path: Path, args: list[str]) -> str:
    proc = subprocess.run(
        ["git", "-C", str(repo_path), *args],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        stderr = proc.stderr.strip()
        stdout = proc.stdout.strip()
        message = stderr if stderr else stdout
        raise RuntimeError(f"git {' '.join(args)} failed: {message}")
    return proc.stdout.strip()


@dataclass
class CommitPlan:
    git_commit: str
    parent_git_commit: str | None
    file_count: int
    tree_bytes: int
    status: str = "pending"
    mapped_commit_id: str | None = None
    error: str | None = None


@dataclass
class ImportCheckpoint:
    version: int
    checkpoint_id: str
    mode: str
    created_at: str
    updated_at: str
    repo_path: str
    repo_id: str
    source_branch: str
    target_ref: str
    source_head: str
    commits: list[CommitPlan]
    warnings: list[str]
    stats: dict[str, int]
    simulate: bool
    api_base_url: str | None


def parse_ls_tree_line(line: str) -> tuple[int, int]:
    # Format: "<mode> <type> <object> <size>\t<path>"
    if "\t" not in line:
        return 0, 0
    meta, _ = line.split("\t", 1)
    parts = meta.split()
    if len(parts) < 4:
        return 0, 0
    raw_size = parts[3]
    try:
        size = int(raw_size)
    except ValueError:
        size = 0
    return 1, size


def commit_inventory(repo_path: Path, commit_sha: str) -> tuple[int, int]:
    output = run_git(repo_path, ["ls-tree", "-r", "-l", commit_sha])
    file_count = 0
    total_bytes = 0
    if not output:
        return file_count, total_bytes
    for line in output.splitlines():
        c, s = parse_ls_tree_line(line)
        file_count += c
        total_bytes += s
    return file_count, total_bytes


def discover_commit_plan(repo_path: Path, source_branch: str) -> list[CommitPlan]:
    output = run_git(repo_path, ["rev-list", "--reverse", "--parents", source_branch])
    commits: list[CommitPlan] = []
    if not output:
        return commits
    for row in output.splitlines():
        parts = row.split()
        git_commit = parts[0]
        parent = parts[1] if len(parts) > 1 else None
        file_count, tree_bytes = commit_inventory(repo_path, git_commit)
        commits.append(
            CommitPlan(
                git_commit=git_commit,
                parent_git_commit=parent,
                file_count=file_count,
                tree_bytes=tree_bytes,
            )
        )
    return commits


def checkpoint_file_path(checkpoint_dir: Path, checkpoint_id: str) -> Path:
    return checkpoint_dir / f"{checkpoint_id}.json"


def save_checkpoint(checkpoint_dir: Path, checkpoint: ImportCheckpoint) -> Path:
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    checkpoint.updated_at = iso_now()
    payload = asdict(checkpoint)
    destination = checkpoint_file_path(checkpoint_dir, checkpoint.checkpoint_id)
    destination.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return destination


def load_checkpoint(checkpoint_dir: Path, checkpoint_id: str) -> ImportCheckpoint:
    path = checkpoint_file_path(checkpoint_dir, checkpoint_id)
    payload = json.loads(path.read_text(encoding="utf-8"))
    commits = [CommitPlan(**entry) for entry in payload["commits"]]
    return ImportCheckpoint(
        version=payload["version"],
        checkpoint_id=payload["checkpoint_id"],
        mode=payload["mode"],
        created_at=payload["created_at"],
        updated_at=payload["updated_at"],
        repo_path=payload["repo_path"],
        repo_id=payload["repo_id"],
        source_branch=payload["source_branch"],
        target_ref=payload["target_ref"],
        source_head=payload["source_head"],
        commits=commits,
        warnings=payload.get("warnings", []),
        stats=payload.get("stats", {}),
        simulate=bool(payload.get("simulate", True)),
        api_base_url=payload.get("api_base_url"),
    )


def build_checkpoint(args: argparse.Namespace, mode: str) -> ImportCheckpoint:
    repo_path = Path(args.repo_path).expanduser().resolve()
    run_git(repo_path, ["rev-parse", "--is-inside-work-tree"])
    source_head = run_git(repo_path, ["rev-parse", args.source_branch])
    commits = discover_commit_plan(repo_path, args.source_branch)
    warnings: list[str] = []
    if not commits:
        warnings.append("No commits discovered on source branch.")
    commit_count = len(commits)
    file_count_total = sum(item.file_count for item in commits)
    tree_bytes_total = sum(item.tree_bytes for item in commits)
    checkpoint_id = f"imp_{uuid.uuid4().hex[:12]}"
    now = iso_now()
    return ImportCheckpoint(
        version=CHECKPOINT_VERSION,
        checkpoint_id=checkpoint_id,
        mode=mode,
        created_at=now,
        updated_at=now,
        repo_path=str(repo_path),
        repo_id=args.repo_id,
        source_branch=args.source_branch,
        target_ref=args.target_ref,
        source_head=source_head,
        commits=commits,
        warnings=warnings,
        stats={
            "commit_count": commit_count,
            "file_count_total": file_count_total,
            "tree_bytes_total": tree_bytes_total,
            "imported_commits": 0,
            "failed_commits": 0,
            "pending_commits": commit_count,
        },
        simulate=bool(args.simulate),
        api_base_url=args.api_base_url,
    )


def import_commit(
    commit: CommitPlan,
    checkpoint: ImportCheckpoint,
    auth_token: str | None,
) -> None:
    if checkpoint.simulate:
        commit.mapped_commit_id = f"commit:sim:{commit.git_commit[:12]}"
        commit.status = "imported"
        return

    if not auth_token:
        raise RuntimeError(
            "Missing auth token for non-simulated execute. Set the requested token env var."
        )

    # Integration point: replace with real API calls:
    # 1) generate manifest/chunk inventory for commit
    # 2) POST /objects/existence
    # 3) POST /uploads/sign and upload missing objects
    # 4) POST /commits/stage then /commits/finalize
    # 5) POST /refs/{refName}/move or create PR
    raise NotImplementedError("Non-simulated import is not implemented in this scaffold.")


def update_stats(checkpoint: ImportCheckpoint) -> None:
    imported = 0
    failed = 0
    pending = 0
    for commit in checkpoint.commits:
        if commit.status == "imported":
            imported += 1
        elif commit.status == "failed":
            failed += 1
        else:
            pending += 1
    checkpoint.stats["imported_commits"] = imported
    checkpoint.stats["failed_commits"] = failed
    checkpoint.stats["pending_commits"] = pending


def execute_plan(
    checkpoint_dir: Path,
    checkpoint: ImportCheckpoint,
    auth_token: str | None,
) -> ImportCheckpoint:
    for commit in checkpoint.commits:
        if commit.status == "imported":
            continue
        if commit.status == "failed":
            continue
        try:
            import_commit(commit, checkpoint, auth_token)
        except Exception as exc:  # noqa: BLE001
            commit.status = "failed"
            commit.error = str(exc)
        finally:
            update_stats(checkpoint)
            save_checkpoint(checkpoint_dir, checkpoint)
    return checkpoint


def render_report(checkpoint: ImportCheckpoint, command: str) -> dict[str, Any]:
    return {
        "command": command,
        "checkpoint_id": checkpoint.checkpoint_id,
        "repo_id": checkpoint.repo_id,
        "source_branch": checkpoint.source_branch,
        "target_ref": checkpoint.target_ref,
        "source_head": checkpoint.source_head,
        "simulate": checkpoint.simulate,
        "api_base_url": checkpoint.api_base_url,
        "stats": checkpoint.stats,
        "warnings": checkpoint.warnings,
    }


def write_report(report: dict[str, Any], output_path: str | None) -> None:
    rendered = json.dumps(report, indent=2)
    if output_path:
        Path(output_path).expanduser().resolve().write_text(rendered + "\n", encoding="utf-8")
    else:
        print(rendered)


def cmd_dry_run(args: argparse.Namespace) -> int:
    checkpoint_dir = Path(args.checkpoint_dir).expanduser().resolve()
    checkpoint = build_checkpoint(args, mode="dry-run")
    path = save_checkpoint(checkpoint_dir, checkpoint)
    report = render_report(checkpoint, command="dry-run")
    report["checkpoint_path"] = str(path)
    write_report(report, args.output)
    return 0


def cmd_execute(args: argparse.Namespace) -> int:
    checkpoint_dir = Path(args.checkpoint_dir).expanduser().resolve()
    auth_token = None
    if args.auth_token_env:
        auth_token = os.environ.get(args.auth_token_env)

    if args.checkpoint_id:
        checkpoint = load_checkpoint(checkpoint_dir, args.checkpoint_id)
        checkpoint.mode = "execute"
        checkpoint.simulate = bool(args.simulate)
        checkpoint.api_base_url = args.api_base_url
    else:
        checkpoint = build_checkpoint(args, mode="execute")

    checkpoint = execute_plan(checkpoint_dir, checkpoint, auth_token)
    report = render_report(checkpoint, command="execute")
    report["checkpoint_path"] = str(
        checkpoint_file_path(checkpoint_dir, checkpoint.checkpoint_id)
    )
    write_report(report, args.output)
    return 0 if checkpoint.stats.get("failed_commits", 0) == 0 else 2


def cmd_resume(args: argparse.Namespace) -> int:
    checkpoint_dir = Path(args.checkpoint_dir).expanduser().resolve()
    checkpoint = load_checkpoint(checkpoint_dir, args.checkpoint_id)
    if args.simulate is not None:
        checkpoint.simulate = bool(args.simulate)
    if args.api_base_url:
        checkpoint.api_base_url = args.api_base_url

    auth_token = None
    if args.auth_token_env:
        auth_token = os.environ.get(args.auth_token_env)

    checkpoint = execute_plan(checkpoint_dir, checkpoint, auth_token)
    report = render_report(checkpoint, command="resume")
    report["checkpoint_path"] = str(
        checkpoint_file_path(checkpoint_dir, checkpoint.checkpoint_id)
    )
    write_report(report, args.output)
    return 0 if checkpoint.stats.get("failed_commits", 0) == 0 else 2


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Gableton import CLI scaffold")
    sub = parser.add_subparsers(dest="command", required=True)

    def add_common(p: argparse.ArgumentParser, *, include_repo_id: bool = True) -> None:
        p.add_argument("--repo-path", default=".", help="Path to source git repository")
        p.add_argument(
            "--checkpoint-dir",
            default=DEFAULT_CHECKPOINT_DIR,
            help="Directory where checkpoints are written",
        )
        p.add_argument("--output", default=None, help="Optional report output file")
        if include_repo_id:
            p.add_argument("--repo-id", required=True, help="Target Gableton repo ID")
            p.add_argument("--source-branch", default="main", help="Source git branch")
            p.add_argument("--target-ref", default="main", help="Target Gableton ref")

    dry_run = sub.add_parser("dry-run", help="Plan import and write checkpoint")
    add_common(dry_run, include_repo_id=True)
    dry_run.add_argument(
        "--simulate",
        action="store_true",
        default=True,
        help="Compatibility flag; dry-run is always simulated",
    )
    dry_run.add_argument(
        "--api-base-url",
        default="https://staging-api.gableton.example.com",
        help="Stored in checkpoint for later execute/resume",
    )
    dry_run.set_defaults(func=cmd_dry_run)

    execute = sub.add_parser("execute", help="Execute import from new/existing checkpoint")
    add_common(execute, include_repo_id=True)
    execute.add_argument(
        "--checkpoint-id",
        default=None,
        help="Resume from checkpoint ID instead of rebuilding plan",
    )
    execute.add_argument(
        "--simulate",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Use simulated commit import loop (default true)",
    )
    execute.add_argument(
        "--api-base-url",
        default="https://staging-api.gableton.example.com",
        help="API base URL for non-simulated mode",
    )
    execute.add_argument(
        "--auth-token-env",
        default="GABLETON_TOKEN",
        help="Environment variable containing auth token",
    )
    execute.set_defaults(func=cmd_execute)

    resume = sub.add_parser("resume", help="Resume import from checkpoint")
    resume.add_argument("--checkpoint-id", required=True, help="Checkpoint ID to resume")
    resume.add_argument(
        "--checkpoint-dir",
        default=DEFAULT_CHECKPOINT_DIR,
        help="Directory where checkpoints are written",
    )
    resume.add_argument(
        "--simulate",
        action=argparse.BooleanOptionalAction,
        default=None,
        help="Override checkpoint simulate mode",
    )
    resume.add_argument(
        "--api-base-url",
        default=None,
        help="Optional API base URL override",
    )
    resume.add_argument(
        "--auth-token-env",
        default="GABLETON_TOKEN",
        help="Environment variable containing auth token",
    )
    resume.add_argument("--output", default=None, help="Optional report output file")
    resume.set_defaults(func=cmd_resume)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return int(args.func(args))
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"error": str(exc)}, indent=2), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
