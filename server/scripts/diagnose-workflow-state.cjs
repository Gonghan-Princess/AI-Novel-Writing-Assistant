#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const DEFAULT_LIMIT = 50;

function parseArgs(argv) {
  const args = {
    db: "",
    output: "summary",
    limit: DEFAULT_LIMIT,
    staleHours: 24,
    proposalDays: 7,
    repairDays: 7,
    taskHours: 2,
    help: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === "--help" || key === "-h") {
      args.help = true;
    } else if (key === "--db" && value) {
      args.db = value;
      index += 1;
    } else if (key === "--output" && value) {
      args.output = value === "json" ? "json" : "summary";
      index += 1;
    } else if (key === "--limit" && value) {
      args.limit = positiveInt(value, args.limit);
      index += 1;
    } else if (key === "--stale-hours" && value) {
      args.staleHours = positiveInt(value, args.staleHours);
      index += 1;
    } else if (key === "--proposal-days" && value) {
      args.proposalDays = positiveInt(value, args.proposalDays);
      index += 1;
    } else if (key === "--repair-days" && value) {
      args.repairDays = positiveInt(value, args.repairDays);
      index += 1;
    } else if (key === "--task-hours" && value) {
      args.taskHours = positiveInt(value, args.taskHours);
      index += 1;
    }
  }

  return args;
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveDatabasePath(input = "", env = process.env) {
  const explicit = String(input || "").trim();
  if (explicit) {
    return path.resolve(explicit);
  }

  const databaseUrl = String(env.DATABASE_URL || "").trim();
  if (databaseUrl.startsWith("file:")) {
    const filePath = databaseUrl.slice("file:".length) || "./dev.db";
    return path.isAbsolute(filePath)
      ? filePath
      : path.resolve(__dirname, "..", filePath);
  }

  return path.resolve(__dirname, "..", "dev.db");
}

function openReadOnlyDatabase(dbPath) {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`SQLite database not found: ${dbPath}`);
  }
  return new Database(dbPath, {
    readonly: true,
    fileMustExist: true,
  });
}

function listTables(db) {
  return new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
}

function listColumns(db, table) {
  return new Set(db.prepare(`PRAGMA table_info("${table}")`).all().map((row) => row.name));
}

function pickColumns(db, table, desired) {
  const columns = listColumns(db, table);
  return desired.filter((column) => columns.has(column));
}

function readRows(db, tables, table, desiredColumns, whereSql, orderColumn, limit) {
  if (!tables.has(table)) {
    return [];
  }
  const columns = pickColumns(db, table, desiredColumns);
  if (columns.length === 0) {
    return [];
  }
  const orderBy = columns.includes(orderColumn) ? ` ORDER BY "${orderColumn}" DESC` : "";
  const sql = `SELECT ${columns.map((column) => `"${column}"`).join(", ")} FROM "${table}" ${whereSql || ""}${orderBy} LIMIT ?`;
  return db.prepare(sql).all(limit);
}

function loadRows(db, limit) {
  const tables = listTables(db);
  return {
    chapters: readRows(
      db,
      tables,
      "Chapter",
      ["id", "novelId", "title", "order", "generationState", "chapterStatus", "updatedAt"],
      "WHERE \"generationState\" = 'reviewed' AND \"chapterStatus\" = 'generating'",
      "updatedAt",
      limit,
    ),
    stateChangeProposals: readRows(
      db,
      tables,
      "StateChangeProposal",
      ["id", "novelId", "chapterId", "status", "riskLevel", "proposalType", "summary", "createdAt", "updatedAt"],
      "WHERE \"status\" IN ('pending', 'pending_review', 'validated') AND \"committedVersionId\" IS NULL",
      "updatedAt",
      limit,
    ),
    characterSyncProposals: readRows(
      db,
      tables,
      "CharacterSyncProposal",
      ["id", "novelId", "characterId", "baseCharacterId", "direction", "status", "summary", "createdAt", "updatedAt"],
      "WHERE \"status\" IN ('pending', 'pending_review')",
      "updatedAt",
      limit,
    ),
    repairTickets: readRows(
      db,
      tables,
      "DirectorArtifact",
      ["id", "novelId", "taskId", "artifactType", "targetType", "targetId", "status", "summary", "createdAt", "updatedAt"],
      "WHERE \"artifactType\" = 'repair_ticket' AND \"status\" NOT IN ('resolved', 'rejected', 'superseded')",
      "updatedAt",
      limit,
    ),
    generationJobs: readRows(
      db,
      tables,
      "GenerationJob",
      ["id", "novelId", "status", "pendingManualRecovery", "currentStage", "currentItemKey", "currentItemLabel", "error", "heartbeatAt", "createdAt", "updatedAt"],
      "WHERE \"status\" IN ('queued', 'running', 'failed', 'cancelled') OR \"pendingManualRecovery\" = 1",
      "updatedAt",
      limit,
    ),
    workflowTasks: readRows(
      db,
      tables,
      "NovelWorkflowTask",
      ["id", "novelId", "lane", "title", "status", "pendingManualRecovery", "currentStage", "currentItemKey", "currentItemLabel", "lastError", "heartbeatAt", "createdAt", "updatedAt"],
      "WHERE \"status\" IN ('queued', 'running', 'failed', 'cancelled') OR \"pendingManualRecovery\" = 1",
      "updatedAt",
      limit,
    ),
    directorRunCommands: readRows(
      db,
      tables,
      "DirectorRunCommand",
      ["id", "taskId", "novelId", "commandType", "status", "errorMessage", "runAfter", "leaseExpiresAt", "createdAt", "updatedAt"],
      "WHERE \"status\" IN ('queued', 'running', 'leased', 'failed')",
      "updatedAt",
      limit,
    ),
    directorRuntimeCommands: readRows(
      db,
      tables,
      "DirectorRuntimeCommand",
      ["id", "runtimeId", "workflowTaskId", "novelId", "commandType", "status", "errorMessage", "runAfter", "leaseExpiresAt", "createdAt", "updatedAt"],
      "WHERE \"status\" IN ('queued', 'running', 'leased', 'failed')",
      "updatedAt",
      limit,
    ),
    directorRuntimeExecutions: readRows(
      db,
      tables,
      "DirectorRuntimeExecution",
      ["id", "runtimeId", "commandId", "workflowTaskId", "novelId", "status", "stepType", "errorClass", "errorMessage", "leaseExpiresAt", "heartbeatAt", "createdAt", "updatedAt"],
      "WHERE \"status\" IN ('leased', 'running', 'failed')",
      "updatedAt",
      limit,
    ),
    sideEffectJobs: readRows(
      db,
      tables,
      "NovelSideEffectJob",
      ["id", "novelId", "jobType", "status", "attempts", "maxAttempts", "runAfter", "leaseExpiresAt", "lastError", "createdAt", "updatedAt"],
      "WHERE \"status\" IN ('pending', 'running', 'failed')",
      "updatedAt",
      limit,
    ),
  };
}

function ageHours(now, value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return Math.round(((now.getTime() - date.getTime()) / 36e5) * 10) / 10;
}

function olderThanHours(now, value, hours) {
  const age = ageHours(now, value);
  return age !== null && age >= hours;
}

function slim(row, fields) {
  const out = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(row, field)) {
      out[field] = row[field];
    }
  }
  return out;
}

function withAge(now, row, field = "updatedAt") {
  return {
    ...row,
    ageHours: ageHours(now, row[field] || row.updatedAt || row.createdAt),
  };
}

function buildDiagnosisReport(input) {
  const now = input.now instanceof Date ? input.now : new Date();
  const staleHours = input.staleHours || 24;
  const proposalHours = (input.proposalDays || 7) * 24;
  const repairHours = (input.repairDays || 7) * 24;
  const taskHours = input.taskHours || 2;
  const rows = input.rows || {};

  const reviewedGeneratingChapters = (rows.chapters || [])
    .map((row) => {
      const item = withAge(now, slim(row, ["id", "novelId", "title", "order", "generationState", "chapterStatus", "updatedAt"]));
      item.stale = olderThanHours(now, row.updatedAt, staleHours);
      return item;
    });

  const proposalRows = [
    ...(rows.stateChangeProposals || []).map((row) => ({ table: "StateChangeProposal", ...row })),
    ...(rows.characterSyncProposals || []).map((row) => ({ table: "CharacterSyncProposal", ...row })),
  ];
  const oldPendingProposals = proposalRows
    .filter((row) => olderThanHours(now, row.updatedAt || row.createdAt, proposalHours))
    .map((row) => withAge(now, slim(row, ["table", "id", "novelId", "chapterId", "characterId", "status", "riskLevel", "proposalType", "direction", "summary", "createdAt", "updatedAt"])));

  const oldRepairTickets = (rows.repairTickets || [])
    .filter((row) => olderThanHours(now, row.updatedAt || row.createdAt, repairHours))
    .map((row) => withAge(now, slim(row, ["id", "novelId", "taskId", "artifactType", "targetType", "targetId", "status", "summary", "createdAt", "updatedAt"])));

  const taskSources = [
    ["GenerationJob", rows.generationJobs || []],
    ["NovelWorkflowTask", rows.workflowTasks || []],
    ["DirectorRunCommand", rows.directorRunCommands || []],
    ["DirectorRuntimeCommand", rows.directorRuntimeCommands || []],
    ["DirectorRuntimeExecution", rows.directorRuntimeExecutions || []],
    ["NovelSideEffectJob", rows.sideEffectJobs || []],
  ];
  const expiredOrFailedWorkflowTasks = taskSources.flatMap(([table, sourceRows]) =>
    sourceRows
      .filter((row) => {
        const status = String(row.status || "");
        return status === "failed"
          || status === "cancelled"
          || row.pendingManualRecovery === 1
          || row.pendingManualRecovery === true
          || olderThanHours(now, row.heartbeatAt || row.leaseExpiresAt || row.updatedAt || row.runAfter || row.createdAt, taskHours);
      })
      .map((row) => withAge(now, slim(row, [
        "id", "novelId", "taskId", "workflowTaskId", "runtimeId", "commandId", "lane", "title", "jobType",
        "commandType", "stepType", "status", "pendingManualRecovery", "currentStage", "currentItemKey",
        "currentItemLabel", "lastError", "error", "errorClass", "errorMessage", "heartbeatAt", "leaseExpiresAt",
        "runAfter", "createdAt", "updatedAt",
      ]))).map((row) => ({ table, ...row })),
  );

  return {
    generatedAt: now.toISOString(),
    thresholds: {
      reviewedGeneratingStaleHours: staleHours,
      pendingProposalDays: input.proposalDays || 7,
      repairTicketDays: input.repairDays || 7,
      workflowTaskHours: taskHours,
    },
    summary: {
      reviewedGeneratingChapters: reviewedGeneratingChapters.length,
      oldPendingProposals: oldPendingProposals.length,
      oldRepairTickets: oldRepairTickets.length,
      expiredOrFailedWorkflowTasks: expiredOrFailedWorkflowTasks.length,
    },
    findings: {
      reviewedGeneratingChapters,
      oldPendingProposals,
      oldRepairTickets,
      expiredOrFailedWorkflowTasks,
    },
  };
}

function formatSummary(report) {
  const lines = [
    "Workflow state diagnosis (read-only)",
    `- generatedAt: ${report.generatedAt}`,
    `- reviewed+generating chapters: ${report.summary.reviewedGeneratingChapters}`,
    `- old pending proposals: ${report.summary.oldPendingProposals}`,
    `- old repair tickets: ${report.summary.oldRepairTickets}`,
    `- expired/failed workflow tasks: ${report.summary.expiredOrFailedWorkflowTasks}`,
  ];

  const sections = [
    ["Reviewed + generating chapters", report.findings.reviewedGeneratingChapters],
    ["Old pending proposals", report.findings.oldPendingProposals],
    ["Old repair tickets", report.findings.oldRepairTickets],
    ["Expired or failed workflow tasks", report.findings.expiredOrFailedWorkflowTasks],
  ];

  for (const [title, rows] of sections) {
    lines.push("", title);
    if (rows.length === 0) {
      lines.push("- none");
      continue;
    }
    rows.slice(0, 20).forEach((row) => {
      const label = row.title || row.summary || row.commandType || row.jobType || row.stepType || row.id;
      lines.push(`- ${row.table ? `${row.table} ` : ""}${row.id}: ${label} (${row.status || row.chapterStatus || "n/a"}, ageHours=${row.ageHours})`);
    });
    if (rows.length > 20) {
      lines.push(`- ... ${rows.length - 20} more`);
    }
  }

  lines.push("", "No repair was attempted. This script only reads SQLite state.");
  return `${lines.join("\n")}\n`;
}

function printHelp() {
  return `Usage: node scripts/diagnose-workflow-state.cjs [options]

Options:
  --db <path>             SQLite database path. Defaults to DATABASE_URL file: or server/dev.db.
  --output <summary|json> Default: summary.
  --limit <n>             Max rows read per table. Default: ${DEFAULT_LIMIT}.
  --stale-hours <n>       reviewed+generating chapter threshold. Default: 24.
  --proposal-days <n>     pending proposal threshold. Default: 7.
  --repair-days <n>       repair ticket threshold. Default: 7.
  --task-hours <n>        queued/running/leased task threshold. Default: 2.
  --help

Read-only checks:
  Chapter reviewed + generating state, old pending proposals, old repair_ticket artifacts,
  failed/cancelled/manual-recovery workflow rows, stale queued/running commands and jobs.
`;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write(printHelp());
    return;
  }
  const dbPath = resolveDatabasePath(args.db);
  const db = openReadOnlyDatabase(dbPath);
  try {
    const rows = loadRows(db, args.limit);
    const report = buildDiagnosisReport({ ...args, rows, now: new Date() });
    report.databasePath = dbPath;
    process.stdout.write(args.output === "json" ? `${JSON.stringify(report, null, 2)}\n` : formatSummary(report));
  } finally {
    db.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message || String(error)}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  buildDiagnosisReport,
  formatSummary,
  loadRows,
  parseArgs,
  printHelp,
  resolveDatabasePath,
};
