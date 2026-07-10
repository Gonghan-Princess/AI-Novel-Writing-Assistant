import fs from "node:fs";
import path from "node:path";
import { appendDesktopLog } from "./logging";
import { resolveDesktopAppDataDir } from "./paths";

const DESKTOP_DATABASE_FILE_NAME = "dev.db";
const DATABASE_SIDE_CAR_SUFFIXES = ["", "-wal", "-shm"] as const;
const RECENT_BACKUP_LIMIT = 5;

export interface DesktopDatabaseBackupEntry {
  name: string;
  directory: string;
  createdAt: string;
  sizeBytes: number;
  files: string[];
}

export interface DesktopDatabaseBackupSnapshot {
  currentDatabasePath: string;
  backupDirectory: string;
  recentBackups: DesktopDatabaseBackupEntry[];
}

export interface DesktopDatabaseBackupResult {
  created: boolean;
  backup: DesktopDatabaseBackupEntry | null;
  snapshot: DesktopDatabaseBackupSnapshot;
}

export function resolveDesktopDatabasePath(): string {
  return path.join(resolveDesktopAppDataDir(), "data", DESKTOP_DATABASE_FILE_NAME);
}

export function resolveDesktopManualDatabaseBackupRoot(): string {
  return path.join(resolveDesktopAppDataDir(), "backups", "database");
}

export function ensureDesktopManualDatabaseBackupRoot(): string {
  const backupDirectory = resolveDesktopManualDatabaseBackupRoot();
  fs.mkdirSync(backupDirectory, { recursive: true });
  return backupDirectory;
}

function getDatabaseBundlePaths(databasePath: string): string[] {
  return DATABASE_SIDE_CAR_SUFFIXES.map((suffix) => `${databasePath}${suffix}`);
}

function createBackupDirectoryName(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `desktop-db-manual-${timestamp}`;
}

function statBackupDirectory(directory: string): DesktopDatabaseBackupEntry | null {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    return null;
  }

  const files = fs.readdirSync(directory)
    .filter((fileName) => fileName === DESKTOP_DATABASE_FILE_NAME || fileName.startsWith(`${DESKTOP_DATABASE_FILE_NAME}-`))
    .sort();

  if (files.length === 0) {
    return null;
  }

  let sizeBytes = 0;
  let newestMtimeMs = 0;
  for (const fileName of files) {
    const filePath = path.join(directory, fileName);
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      continue;
    }
    sizeBytes += stats.size;
    newestMtimeMs = Math.max(newestMtimeMs, stats.mtimeMs);
  }

  const directoryStats = fs.statSync(directory);
  const createdAt = new Date(newestMtimeMs || directoryStats.mtimeMs).toISOString();
  return {
    name: path.basename(directory),
    directory,
    createdAt,
    sizeBytes,
    files,
  };
}

export function getDesktopDatabaseBackupSnapshot(): DesktopDatabaseBackupSnapshot {
  const backupDirectory = resolveDesktopManualDatabaseBackupRoot();
  const recentBackups = fs.existsSync(backupDirectory)
    ? fs.readdirSync(backupDirectory)
      .map((name) => statBackupDirectory(path.join(backupDirectory, name)))
      .filter((entry): entry is DesktopDatabaseBackupEntry => entry != null)
      .sort((left, right) => right.name.localeCompare(left.name))
      .slice(0, RECENT_BACKUP_LIMIT)
    : [];

  return {
    currentDatabasePath: resolveDesktopDatabasePath(),
    backupDirectory,
    recentBackups,
  };
}

export function createDesktopDatabaseBackup(): DesktopDatabaseBackupResult {
  const databasePath = resolveDesktopDatabasePath();
  if (!fs.existsSync(databasePath)) {
    throw new Error(`Desktop database file does not exist: ${databasePath}`);
  }

  const backupDirectory = path.join(ensureDesktopManualDatabaseBackupRoot(), createBackupDirectoryName());
  fs.mkdirSync(backupDirectory, { recursive: true });

  for (const sourcePath of getDatabaseBundlePaths(databasePath)) {
    if (!fs.existsSync(sourcePath)) {
      continue;
    }
    const targetPath = path.join(backupDirectory, path.basename(sourcePath));
    fs.copyFileSync(sourcePath, targetPath);
  }

  const primaryBackupPath = path.join(backupDirectory, DESKTOP_DATABASE_FILE_NAME);
  const sourceSize = fs.statSync(databasePath).size;
  const backupSize = fs.existsSync(primaryBackupPath) ? fs.statSync(primaryBackupPath).size : -1;
  if (sourceSize !== backupSize) {
    throw new Error(`Desktop database backup verification failed at ${primaryBackupPath}.`);
  }

  appendDesktopLog("desktop.database-backup", `Created manual database backup at ${backupDirectory}.`);
  const backup = statBackupDirectory(backupDirectory);

  return {
    created: true,
    backup,
    snapshot: getDesktopDatabaseBackupSnapshot(),
  };
}
