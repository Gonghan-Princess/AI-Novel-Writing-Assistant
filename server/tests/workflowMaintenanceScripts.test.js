const test = require("node:test");
const assert = require("node:assert/strict");

const smoke = require("../scripts/full-book-smoke.cjs");
const diagnose = require("../scripts/diagnose-workflow-state.cjs");

test("full-book smoke args default to dry-run and mock-safe chapter count", () => {
  const args = smoke.parseArgs(["node", "full-book-smoke.cjs"]);

  assert.equal(args.dryRun, true);
  assert.equal(args.allowRealLlm, false);
  assert.equal(args.chapters, 3);
  assert.equal(args.output, "summary");
});

test("full-book smoke plan flags missing real LLM env only when explicitly enabled", () => {
  const plan = smoke.buildSmokePlan({
    novelId: "novel-1",
    idea: "冷宫公主逆袭",
    chapters: 2,
    dryRun: false,
    allowRealLlm: true,
    env: {},
  });

  assert.equal(plan.safeMode, false);
  assert.deepEqual(plan.missingEnv, ["DATABASE_URL", "OPENAI_API_KEY"]);
  assert.equal(plan.steps.some((step) => step.name === "generate_chapters"), true);
});

test("workflow diagnosis classifies stale reviewed+generating chapters and old pending proposals", () => {
  const now = new Date("2026-07-11T00:00:00.000Z");
  const report = diagnose.buildDiagnosisReport({
    now,
    staleHours: 24,
    proposalDays: 7,
    repairDays: 7,
    taskHours: 2,
    rows: {
      chapters: [{
        id: "chapter-1",
        novelId: "novel-1",
        title: "第一章",
        order: 1,
        generationState: "reviewed",
        chapterStatus: "generating",
        updatedAt: "2026-07-09T00:00:00.000Z",
      }],
      stateChangeProposals: [{
        id: "proposal-1",
        novelId: "novel-1",
        status: "pending_review",
        riskLevel: "medium",
        proposalType: "character_resource_update",
        createdAt: "2026-07-01T00:00:00.000Z",
        updatedAt: "2026-07-01T00:00:00.000Z",
      }],
      characterSyncProposals: [],
      generationJobs: [],
      workflowTasks: [],
      directorRunCommands: [],
      directorRuntimeCommands: [],
      directorRuntimeExecutions: [],
      sideEffectJobs: [],
    },
  });

  assert.equal(report.summary.reviewedGeneratingChapters, 1);
  assert.equal(report.summary.oldPendingProposals, 1);
  assert.equal(report.findings.reviewedGeneratingChapters[0].ageHours, 48);
  assert.equal(report.findings.oldPendingProposals[0].table, "StateChangeProposal");
});
