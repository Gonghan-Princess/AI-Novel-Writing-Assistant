import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createDesktopDatabaseBackup,
  getDesktopDatabaseBackupSnapshot,
} from "../dist/runtime/databaseBackup.js";

function makeTempAppData() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ai-novel-desktop-backup-"));
}

function writeSqliteLikeDatabase(filePath, content = "SQLite format 3\u0000test") {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

test("desktop database backup snapshot lists the newest five backup directories", () => {
  const previousAppDataDir = process.env.AI_NOVEL_APP_DATA_DIR;
  const appDataDir = makeTempAppData();
  process.env.AI_NOVEL_APP_DATA_DIR = appDataDir;

  try {
    const backupRoot = path.join(appDataDir, "backups", "database");
    for (let index = 0; index < 6; index += 1) {
      const backupDir = path.join(backupRoot, `desktop-db-manual-2026-07-11T00-00-0${index}-000Z`);
      writeSqliteLikeDatabase(path.join(backupDir, "dev.db"), `SQLite format 3\u0000${index}`);
    }

    const snapshot = getDesktopDatabaseBackupSnapshot();

    assert.equal(snapshot.currentDatabasePath, path.join(appDataDir, "data", "dev.db"));
    assert.equal(snapshot.backupDirectory, backupRoot);
    assert.equal(snapshot.recentBackups.length, 5);
    assert.equal(snapshot.recentBackups[0].name, "desktop-db-manual-2026-07-11T00-00-05-000Z");
    assert.equal(snapshot.recentBackups[4].name, "desktop-db-manual-2026-07-11T00-00-01-000Z");
  } finally {
    if (previousAppDataDir == null) {
      delete process.env.AI_NOVEL_APP_DATA_DIR;
    } else {
      process.env.AI_NOVEL_APP_DATA_DIR = previousAppDataDir;
    }
    fs.rmSync(appDataDir, { recursive: true, force: true });
  }
});

test("createDesktopDatabaseBackup copies the database bundle into a new backup directory", () => {
  const previousAppDataDir = process.env.AI_NOVEL_APP_DATA_DIR;
  const appDataDir = makeTempAppData();
  process.env.AI_NOVEL_APP_DATA_DIR = appDataDir;

  try {
    const databasePath = path.join(appDataDir, "data", "dev.db");
    writeSqliteLikeDatabase(databasePath);
    fs.writeFileSync(`${databasePath}-wal`, "wal");
    fs.writeFileSync(`${databasePath}-shm`, "shm");

    const result = createDesktopDatabaseBackup();

    assert.equal(result.created, true);
    assert.ok(result.backup?.directory);
    assert.equal(fs.readFileSync(path.join(result.backup.directory, "dev.db"), "utf8"), "SQLite format 3\u0000test");
    assert.equal(fs.readFileSync(path.join(result.backup.directory, "dev.db-wal"), "utf8"), "wal");
    assert.equal(fs.readFileSync(path.join(result.backup.directory, "dev.db-shm"), "utf8"), "shm");
    assert.equal(result.snapshot.recentBackups[0].directory, result.backup.directory);
  } finally {
    if (previousAppDataDir == null) {
      delete process.env.AI_NOVEL_APP_DATA_DIR;
    } else {
      process.env.AI_NOVEL_APP_DATA_DIR = previousAppDataDir;
    }
    fs.rmSync(appDataDir, { recursive: true, force: true });
  }
});
