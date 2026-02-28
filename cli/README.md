# Gableton Import CLI Scaffold

This directory contains a runnable scaffold for Phase 1 repository migration.

## Files

- `gableton_import.py`: command-line tool with `dry-run`, `execute`, `resume`
- `contracts/checkpoint.schema.json`: checkpoint JSON contract
- `contracts/import-report.schema.json`: command report JSON contract

## Command Contract

### dry-run

Builds a commit import plan from a source Git branch and writes a checkpoint.

```bash
python3 cli/gableton_import.py dry-run \
  --repo-path /path/to/gitdaw-repo \
  --repo-id repo_123 \
  --source-branch main \
  --target-ref main \
  --checkpoint-dir .gableton/import-checkpoints \
  --output /tmp/import-dry-run.json
```

### execute

Runs import processing from a new plan or existing checkpoint.

```bash
python3 cli/gableton_import.py execute \
  --repo-path /path/to/gitdaw-repo \
  --repo-id repo_123 \
  --source-branch main \
  --target-ref main \
  --simulate \
  --checkpoint-dir .gableton/import-checkpoints \
  --output /tmp/import-execute.json
```

Reuse an existing checkpoint:

```bash
python3 cli/gableton_import.py execute \
  --repo-path /path/to/gitdaw-repo \
  --repo-id repo_123 \
  --source-branch main \
  --target-ref main \
  --checkpoint-id imp_aaaaaaaaaaaa \
  --simulate
```

### resume

Continues an existing checkpoint.

```bash
python3 cli/gableton_import.py resume \
  --checkpoint-id imp_aaaaaaaaaaaa \
  --checkpoint-dir .gableton/import-checkpoints \
  --simulate \
  --output /tmp/import-resume.json
```

## Integration Notes

- `--simulate` defaults to true; this scaffold marks commits as imported without remote writes.
- Non-simulated execution is intentionally `NotImplementedError` in `import_commit`.
- Integration sequence for real mode:
  1. Build commit manifest and object inventory.
  2. Call `POST /v1/repos/{repoId}/objects/existence`.
  3. Call `POST /v1/repos/{repoId}/uploads/sign` and upload missing objects.
  4. Call `POST /v1/repos/{repoId}/commits/stage`.
  5. Call `POST /v1/repos/{repoId}/commits/finalize`.
  6. Move ref with `POST /v1/repos/{repoId}/refs/{refName}/move` or open PR.
