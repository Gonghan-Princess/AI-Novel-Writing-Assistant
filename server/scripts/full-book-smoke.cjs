#!/usr/bin/env node

const path = require("node:path");

const DEFAULT_IDEA = "Gonghan-Princess smoke: a cold-palace princess rebuilds power through wit, allies, and careful revenge.";
const DEFAULT_CHAPTERS = 3;

function parseBoolean(value) {
  return value === true || value === "1" || value === "true" || value === "yes";
}

function parseArgs(argv) {
  const args = {
    novelId: "",
    idea: DEFAULT_IDEA,
    chapters: DEFAULT_CHAPTERS,
    output: "summary",
    dryRun: true,
    mockSafe: true,
    allowRealLlm: false,
    apiBaseUrl: process.env.SMOKE_API_BASE_URL || process.env.API_BASE_URL || "http://127.0.0.1:3001",
    help: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === "--help" || key === "-h") {
      args.help = true;
    } else if (key === "--novel-id" && value) {
      args.novelId = value;
      index += 1;
    } else if (key === "--idea" && value) {
      args.idea = value;
      index += 1;
    } else if (key === "--chapters" && value) {
      const parsed = Number.parseInt(value, 10);
      args.chapters = Number.isFinite(parsed) && parsed > 0 ? parsed : args.chapters;
      index += 1;
    } else if (key === "--output" && value) {
      args.output = value === "json" ? "json" : "summary";
      index += 1;
    } else if (key === "--api-base-url" && value) {
      args.apiBaseUrl = value;
      index += 1;
    } else if (key === "--run") {
      args.dryRun = false;
    } else if (key === "--dry-run") {
      args.dryRun = true;
    } else if (key === "--allow-real-llm") {
      args.allowRealLlm = true;
      args.mockSafe = false;
    } else if (key === "--mock-safe") {
      args.mockSafe = true;
      args.allowRealLlm = false;
    }
  }

  if (parseBoolean(process.env.FULL_BOOK_SMOKE_ALLOW_REAL_LLM)) {
    args.allowRealLlm = true;
    args.mockSafe = false;
  }

  return args;
}

function hasEnv(env, key) {
  return typeof env[key] === "string" && env[key].trim().length > 0;
}

function buildSmokePlan(input) {
  const env = input.env || process.env;
  const allowRealLlm = input.allowRealLlm === true;
  const dryRun = input.dryRun !== false;
  const safeMode = dryRun || !allowRealLlm;
  const missingEnv = [];

  if (!safeMode) {
    for (const key of ["DATABASE_URL", "OPENAI_API_KEY"]) {
      if (!hasEnv(env, key)) {
        missingEnv.push(key);
      }
    }
  }

  const chapterCount = Math.max(1, Number.parseInt(String(input.chapters || DEFAULT_CHAPTERS), 10) || DEFAULT_CHAPTERS);
  const novelId = String(input.novelId || "").trim();
  const idea = String(input.idea || DEFAULT_IDEA).trim();
  const apiBaseUrl = String(input.apiBaseUrl || "http://127.0.0.1:3001").replace(/\/+$/, "");

  const steps = [
    {
      name: "preflight",
      mode: safeMode ? "mock-safe" : "real-llm",
      checks: safeMode
        ? ["No LLM provider calls will be made.", "Use --run --allow-real-llm only for an explicit real smoke."]
        : ["DATABASE_URL and OPENAI_API_KEY are required.", "Target API must point at a disposable Gonghan-Princess environment."],
    },
    {
      name: novelId ? "load_existing_novel" : "create_or_seed_novel",
      method: novelId ? "GET" : "POST",
      path: novelId ? `/api/novels/${encodeURIComponent(novelId)}` : "/api/novels",
      payload: novelId ? null : { title: "Gonghan-Princess Smoke", idea },
    },
    {
      name: "start_auto_director",
      method: "POST",
      path: novelId
        ? `/api/novels/${encodeURIComponent(novelId)}/director/auto`
        : "/api/novels/:createdNovelId/director/auto",
      payload: {
        runMode: safeMode ? "mock_safe" : "auto_pipeline",
        idea,
        chapters: chapterCount,
      },
    },
    {
      name: "generate_chapters",
      method: "POST",
      path: novelId
        ? `/api/novels/${encodeURIComponent(novelId)}/pipeline`
        : "/api/novels/:createdNovelId/pipeline",
      payload: {
        startOrder: 1,
        endOrder: chapterCount,
        dryRun: safeMode,
        allowRealLlm,
      },
    },
    {
      name: "diagnose_after_run",
      command: "pnpm --filter @ai-novel/server workflow:diagnose -- --output summary",
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    cwd: path.resolve(__dirname, ".."),
    apiBaseUrl,
    novelId: novelId || null,
    idea,
    chapters: chapterCount,
    dryRun,
    safeMode,
    allowRealLlm,
    missingEnv,
    steps,
    nextAction: missingEnv.length > 0
      ? `Set ${missingEnv.join(", ")} or rerun without --allow-real-llm.`
      : dryRun
        ? "Dry-run only: review the plan, then rerun with --run for an explicit execution path."
        : "Execution mode requested. This skeleton currently performs preflight and plan emission only; wire API calls here when the disposable smoke environment is ready.",
  };
}

function formatSummary(plan) {
  const lines = [
    "Full-book smoke plan",
    `- mode: ${plan.safeMode ? "dry-run/mock-safe" : "real-llm requested"}`,
    `- api: ${plan.apiBaseUrl}`,
    `- novelId: ${plan.novelId || "(create/seed new smoke novel)"}`,
    `- chapters: ${plan.chapters}`,
    `- idea: ${plan.idea}`,
  ];

  if (plan.missingEnv.length > 0) {
    lines.push(`- missing env: ${plan.missingEnv.join(", ")}`);
  }

  lines.push("", "Steps:");
  plan.steps.forEach((step, index) => {
    const target = step.command || `${step.method || "CHECK"} ${step.path || ""}`.trim();
    lines.push(`${index + 1}. ${step.name}: ${target}`);
  });
  lines.push("", `Next: ${plan.nextAction}`);
  return `${lines.join("\n")}\n`;
}

function printHelp() {
  return `Usage: node scripts/full-book-smoke.cjs [options]

Options:
  --novel-id <id>       Reuse an existing novel instead of planning a seed novel.
  --idea <text>         Smoke idea seed. Defaults to Gonghan-Princess safe sample.
  --chapters <n>        Chapter range to exercise. Default: ${DEFAULT_CHAPTERS}.
  --output <summary|json>
  --api-base-url <url>  API base URL for future execution wiring.
  --dry-run            Emit the plan only. Default.
  --run                Request execution mode; still mock-safe unless real LLM is allowed.
  --mock-safe          Force no real LLM provider calls. Default.
  --allow-real-llm     Explicitly allow a real LLM smoke. Requires DATABASE_URL and OPENAI_API_KEY.
  --help

Environment:
  DATABASE_URL          Required only with --run --allow-real-llm.
  OPENAI_API_KEY        Required only with --run --allow-real-llm.
  SMOKE_API_BASE_URL    Optional API base URL.
`;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write(printHelp());
    return;
  }
  const plan = buildSmokePlan(args);
  process.stdout.write(args.output === "json" ? `${JSON.stringify(plan, null, 2)}\n` : formatSummary(plan));
  if (!plan.safeMode && plan.missingEnv.length > 0) {
    process.exitCode = 2;
  }
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message || String(error)}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_CHAPTERS,
  DEFAULT_IDEA,
  buildSmokePlan,
  formatSummary,
  parseArgs,
  printHelp,
};
