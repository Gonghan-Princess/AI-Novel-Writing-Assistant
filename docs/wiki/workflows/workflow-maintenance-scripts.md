# Workflow Maintenance Scripts

This page documents two read-only or mock-safe maintenance scripts for the Gonghan-Princess project.

## Full-book smoke skeleton

Command:

```bash
pnpm --filter @ai-novel/server smoke:full-book -- --help
pnpm --filter @ai-novel/server smoke:full-book -- --idea "冷宫公主逆袭" --chapters 3
pnpm --filter @ai-novel/server smoke:full-book -- --novel-id <novelId> --chapters 5 --output json
```

Default behavior is `dry-run` and `mock-safe`. It emits the intended long-chain smoke plan and does not call an LLM provider.

Real LLM mode must be explicit:

```bash
DATABASE_URL=file:./dev.db OPENAI_API_KEY=... pnpm --filter @ai-novel/server smoke:full-book -- --run --allow-real-llm
```

Required environment for real mode:

- `DATABASE_URL`
- `OPENAI_API_KEY`

Optional environment:

- `SMOKE_API_BASE_URL`, used as the target API base URL in the emitted plan.

The current script is a skeleton: it performs preflight and plan emission. Keep it pointed at a disposable Gonghan-Princess database when wiring real API calls later.

## Workflow state diagnosis

Command:

```bash
pnpm --filter @ai-novel/server workflow:diagnose -- --help
pnpm --filter @ai-novel/server workflow:diagnose -- --output summary
pnpm --filter @ai-novel/server workflow:diagnose -- --output json --limit 100
pnpm --filter @ai-novel/server workflow:diagnose -- --db server/dev.db --stale-hours 12 --task-hours 1
```

The diagnosis script opens SQLite in read-only mode and does not repair data. It reports:

- `Chapter` rows stuck in `generationState=reviewed` and `chapterStatus=generating`.
- Old pending proposals from `StateChangeProposal` and `CharacterSyncProposal`.
- Old active repair tickets from `DirectorArtifact` where `artifactType=repair_ticket`.
- Failed, cancelled, manual-recovery, stale queued, stale running, or stale leased workflow rows from `GenerationJob`, `NovelWorkflowTask`, `DirectorRunCommand`, `DirectorRuntimeCommand`, `DirectorRuntimeExecution`, and `NovelSideEffectJob`.

Default thresholds:

- reviewed + generating chapter: `24` hours
- pending proposal: `7` days
- repair ticket: `7` days
- workflow task/command/job: `2` hours

The database path is resolved in this order:

1. `--db <path>`
2. `DATABASE_URL=file:...`
3. `server/dev.db`

Use JSON output for automation and summary output for quick human triage.
