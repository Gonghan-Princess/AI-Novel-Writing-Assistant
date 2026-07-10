import fs from "node:fs";
import path from "node:path";
import { resolveDesktopDatabasePath, resolveDesktopManualDatabaseBackupRoot } from "./databaseBackup";
import { resolveDesktopLogsDir } from "./paths";

type ReadinessStatus = "ok" | "warn" | "error";

interface SqliteStatement {
  get(...params: unknown[]): Record<string, unknown> | undefined;
}

interface SqliteDatabase {
  prepare(sql: string): SqliteStatement;
  close(): void;
}

type SqliteDatabaseConstructor = new (
  filePath: string,
  options?: {
    readonly?: boolean;
    fileMustExist?: boolean;
  },
) => SqliteDatabase;

const BetterSqlite3 = require("better-sqlite3") as SqliteDatabaseConstructor;

export interface DesktopReadinessItem {
  id: "service" | "database" | "logs" | "model-config" | "backup-directory";
  label: string;
  status: ReadinessStatus;
  detail: string;
  path?: string;
}

export interface DesktopReadinessSnapshot {
  status: ReadinessStatus;
  updatedAt: string;
  items: DesktopReadinessItem[];
}

function combineStatus(items: DesktopReadinessItem[]): ReadinessStatus {
  if (items.some((item) => item.status === "error")) {
    return "error";
  }
  if (items.some((item) => item.status === "warn")) {
    return "warn";
  }
  return "ok";
}

function checkDirectoryWritable(directory: string): boolean {
  fs.mkdirSync(directory, { recursive: true });
  const probePath = path.join(directory, `.readiness-${process.pid}-${Date.now()}.tmp`);
  fs.writeFileSync(probePath, "ok");
  fs.rmSync(probePath, { force: true });
  return true;
}

function readModelConfigStatus(databasePath: string): Pick<DesktopReadinessItem, "status" | "detail"> {
  if (!fs.existsSync(databasePath)) {
    return {
      status: "warn",
      detail: "Database has not been created yet, so model configuration cannot be inspected.",
    };
  }

  let database: SqliteDatabase | null = null;
  try {
    database = new BetterSqlite3(databasePath, { readonly: true, fileMustExist: true });
    const row = database.prepare(
      `SELECT COUNT(*) AS count
       FROM APIKey
       WHERE isActive = 1
         AND (
           NULLIF(TRIM(COALESCE(key, '')), '') IS NOT NULL
           OR NULLIF(TRIM(COALESCE(baseURL, '')), '') IS NOT NULL
           OR NULLIF(TRIM(COALESCE(model, '')), '') IS NOT NULL
         )`,
    ).get();
    const count = Number(row?.count ?? 0);
    if (count > 0) {
      return {
        status: "ok",
        detail: `${count} active model provider configuration${count === 1 ? "" : "s"} detected.`,
      };
    }
    return {
      status: "warn",
      detail: "No active model provider configuration was found yet.",
    };
  } catch (error) {
    return {
      status: "warn",
      detail: error instanceof Error ? error.message : "Model configuration could not be inspected.",
    };
  } finally {
    database?.close();
  }
}

export function getDesktopReadinessSnapshot(options: { serverHealthy: boolean }): DesktopReadinessSnapshot {
  const databasePath = resolveDesktopDatabasePath();
  const logsDir = resolveDesktopLogsDir();
  const backupDirectory = resolveDesktopManualDatabaseBackupRoot();
  const items: DesktopReadinessItem[] = [
    {
      id: "service",
      label: "Local service",
      status: options.serverHealthy ? "ok" : "warn",
      detail: options.serverHealthy
        ? "The local desktop API service is reachable."
        : "The local desktop API service is still starting or not yet reachable.",
    },
  ];

  items.push({
    id: "database",
    label: "Database",
    status: fs.existsSync(databasePath) ? "ok" : "warn",
    detail: fs.existsSync(databasePath)
      ? "The desktop SQLite database file is present."
      : "The desktop SQLite database file will be created after the local service initializes.",
    path: databasePath,
  });

  try {
    checkDirectoryWritable(logsDir);
    items.push({
      id: "logs",
      label: "Logs",
      status: "ok",
      detail: "The desktop log directory is writable.",
      path: logsDir,
    });
  } catch (error) {
    items.push({
      id: "logs",
      label: "Logs",
      status: "error",
      detail: error instanceof Error ? error.message : "The desktop log directory is not writable.",
      path: logsDir,
    });
  }

  const modelConfig = readModelConfigStatus(databasePath);
  items.push({
    id: "model-config",
    label: "Model configuration",
    status: modelConfig.status,
    detail: modelConfig.detail,
    path: databasePath,
  });

  try {
    checkDirectoryWritable(backupDirectory);
    items.push({
      id: "backup-directory",
      label: "Backup directory",
      status: "ok",
      detail: "The manual database backup directory is writable.",
      path: backupDirectory,
    });
  } catch (error) {
    items.push({
      id: "backup-directory",
      label: "Backup directory",
      status: "error",
      detail: error instanceof Error ? error.message : "The manual database backup directory is not writable.",
      path: backupDirectory,
    });
  }

  return {
    status: combineStatus(items),
    updatedAt: new Date().toISOString(),
    items,
  };
}
