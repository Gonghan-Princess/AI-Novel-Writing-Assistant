type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogOptions {
  expectedTestNoise?: boolean;
}

export interface LogError {
  name?: string;
  message: string;
  stack?: string;
  code?: string;
}

export interface LogEntry {
  level: LogLevel;
  source: string;
  message: string;
  meta: unknown;
  error: LogError | null;
  timestamp: string;
}

export interface Logger {
  debug(message: string, meta?: unknown, error?: unknown, options?: LogOptions): void;
  info(message: string, meta?: unknown, error?: unknown, options?: LogOptions): void;
  warn(message: string, meta?: unknown, error?: unknown, options?: LogOptions): void;
  error(message: string, meta?: unknown, error?: unknown, options?: LogOptions): void;
}

function extractErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function normalizeError(error: unknown): LogError | null {
  if (error === undefined || error === null) {
    return null;
  }
  if (error instanceof Error) {
    const code = extractErrorCode(error);
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(code ? { code } : {}),
    };
  }
  return {
    message: typeof error === "string" ? error : String(error),
    ...(extractErrorCode(error) ? { code: extractErrorCode(error) } : {}),
  };
}

function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === "test"
    || process.env.npm_lifecycle_event?.startsWith("test") === true
    || process.argv.some((arg) => /\.test\.[cm]?js$/i.test(arg))
    || process.env.AI_NOVEL_SUPPRESS_EXPECTED_TEST_LOGS === "1";
}

function shouldSuppressExpectedTestNoise(options?: LogOptions): boolean {
  if (!options?.expectedTestNoise) {
    return false;
  }
  if (process.env.AI_NOVEL_TEST_LOGS === "1") {
    return false;
  }
  return isTestEnvironment();
}

function writeLog(level: LogLevel, source: string, message: string, meta?: unknown, error?: unknown, options?: LogOptions): void {
  if (shouldSuppressExpectedTestNoise(options)) {
    return;
  }

  const entry: LogEntry = {
    level,
    source,
    message,
    meta: meta ?? {},
    error: normalizeError(error),
    timestamp: new Date().toISOString(),
  };

  console[level](entry);
}

export function createLogger(source: string): Logger {
  return {
    debug: (message, meta, error, options) => writeLog("debug", source, message, meta, error, options),
    info: (message, meta, error, options) => writeLog("info", source, message, meta, error, options),
    warn: (message, meta, error, options) => writeLog("warn", source, message, meta, error, options),
    error: (message, meta, error, options) => writeLog("error", source, message, meta, error, options),
  };
}
