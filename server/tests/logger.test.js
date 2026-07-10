const test = require("node:test");
const assert = require("node:assert/strict");

function captureConsole(method) {
  const original = console[method];
  const calls = [];
  console[method] = (...args) => {
    calls.push(args);
  };
  return {
    calls,
    restore() {
      console[method] = original;
    },
  };
}

function withEnv(values, fn) {
  const previous = {};
  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    if (values[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = values[key];
    }
  }
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const key of Object.keys(values)) {
        if (previous[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = previous[key];
        }
      }
    });
}

test("logger writes structured console entries with source, message, meta, and error stack", () => {
  const { createLogger } = require("../dist/platform/logging/logger.js");
  const capture = captureConsole("error");
  try {
    const logger = createLogger("logger.test");
    const error = new Error("kaboom");

    logger.error("structured failure", { commandId: "cmd-1" }, error);

    assert.equal(capture.calls.length, 1);
    const [entry] = capture.calls[0];
    assert.equal(entry.source, "logger.test");
    assert.equal(entry.message, "structured failure");
    assert.deepEqual(entry.meta, { commandId: "cmd-1" });
    assert.match(entry.error.stack, /Error: kaboom/);
  } finally {
    capture.restore();
  }
});

test("expected EventBus handler errors are quiet in test unless test logs are enabled", async () => {
  const { EventBus } = require("../dist/events/EventBus.js");
  const capture = captureConsole("error");
  try {
    await withEnv({ NODE_ENV: "test", AI_NOVEL_TEST_LOGS: undefined }, async () => {
      const bus = new EventBus();
      bus.on("chapter:updated", () => {
        throw new Error("expected handler failure");
      });

      await bus.emit({
        type: "chapter:updated",
        payload: { novelId: "novel-1", chapterId: "chapter-1", chapterOrder: 1 },
      });
    });

    assert.equal(capture.calls.length, 0);
  } finally {
    capture.restore();
  }
});

test("sqlite retry logs are quiet in test but can be enabled", async () => {
  const { withSqliteRetry } = require("../dist/db/sqliteRetry.js");

  const quietCapture = captureConsole("warn");
  try {
    await withEnv({ NODE_ENV: "test", AI_NOVEL_TEST_LOGS: undefined }, async () => {
      let attempts = 0;
      await withSqliteRetry(async () => {
        attempts += 1;
        if (attempts === 1) {
          const error = new Error("database is locked");
          error.code = "SQLITE_BUSY";
          throw error;
        }
        return "ok";
      }, { label: "quiet-test", retryDelaysMs: [0] });
    });
    assert.equal(quietCapture.calls.length, 0);
  } finally {
    quietCapture.restore();
  }

  const enabledCapture = captureConsole("warn");
  try {
    await withEnv({ NODE_ENV: "test", AI_NOVEL_TEST_LOGS: "1" }, async () => {
      let attempts = 0;
      await withSqliteRetry(async () => {
        attempts += 1;
        if (attempts === 1) {
          const error = new Error("database is locked");
          error.code = "SQLITE_BUSY";
          throw error;
        }
        return "ok";
      }, { label: "enabled-test", retryDelaysMs: [0] });
    });

    assert.equal(enabledCapture.calls.length, 1);
    const [entry] = enabledCapture.calls[0];
    assert.equal(entry.source, "sqlite.retry");
    assert.equal(entry.message, "retrying transient sqlite failure");
    assert.equal(entry.meta.label, "enabled-test");
  } finally {
    enabledCapture.restore();
  }
});
