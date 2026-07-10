#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { TextDecoder } = require("node:util");

const repoRoot = path.resolve(__dirname, "..");
const decoder = new TextDecoder("utf-8", { fatal: true });

const DEFAULT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".txt",
  ".yml",
  ".yaml",
]);

const SKIPPED_DIRS = new Set([
  ".git",
  ".turbo",
  ".vite",
  "dist",
  "node_modules",
  "out",
  "release",
  "stage",
]);

const MOJIBAKE_PATTERNS = [
  new RegExp(String.fromCodePoint(0x951f), "g"),
  new RegExp(String.fromCodePoint(0xfffd), "g"),
  /[纭楂瀹犺妭绔屾湰][\u4e00-\u9fff]{0,4}[?]/g,
  /[A-Za-z0-9]銆/g,
  /[A-Za-z0-9]锛/g,
  /[A-Za-z0-9]鈥/g,
];

function parseArgs(argv) {
  const options = {
    json: false,
    includeExts: DEFAULT_EXTENSIONS,
    maxFindingsPerFile: 8,
    roots: ["README.md", "CONTRIBUTING.md", "FORK_NOTICE.md", ".github", "docs", "client/src", "server/src", "shared", "scripts"],
  };
  for (const arg of argv) {
    if (arg === "--json") {
      options.json = true;
    } else if (arg.startsWith("--roots=")) {
      options.roots = arg.slice("--roots=".length).split(",").map((item) => item.trim()).filter(Boolean);
    } else if (arg.startsWith("--ext=")) {
      options.includeExts = new Set(arg.slice("--ext=".length).split(",").map((item) => {
        const ext = item.trim();
        return ext.startsWith(".") ? ext : `.${ext}`;
      }).filter(Boolean));
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/check-text-encoding.cjs [--json] [--roots=docs,README.md] [--ext=.md,.ts]

Checks text files for invalid UTF-8 and common mojibake markers.
The script is report-only and never rewrites files.`);
}

function walk(target, options, files = []) {
  const fullPath = path.resolve(repoRoot, target);
  if (!fs.existsSync(fullPath)) {
    return files;
  }
  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    const basename = path.basename(fullPath);
    if (SKIPPED_DIRS.has(basename)) {
      return files;
    }
    for (const entry of fs.readdirSync(fullPath)) {
      walk(path.relative(repoRoot, path.join(fullPath, entry)), options, files);
    }
    return files;
  }
  if (stat.isFile() && options.includeExts.has(path.extname(fullPath))) {
    files.push(fullPath);
  }
  return files;
}

function lineAndColumn(text, index) {
  const before = text.slice(0, index);
  const lines = before.split(/\r?\n/);
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

function checkFile(file, options) {
  const rel = path.relative(repoRoot, file).replace(/\\/g, "/");
  const bytes = fs.readFileSync(file);
  let text;
  try {
    text = decoder.decode(bytes);
  } catch (error) {
    return {
      file: rel,
      validUtf8: false,
      findings: [{
        type: "invalid_utf8",
        message: error instanceof Error ? error.message : String(error),
      }],
    };
  }

  const findings = [];
  for (const pattern of MOJIBAKE_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) && findings.length < options.maxFindingsPerFile) {
      const location = lineAndColumn(text, match.index);
      findings.push({
        type: "possible_mojibake",
        line: location.line,
        column: location.column,
        sample: match[0],
      });
    }
  }
  return { file: rel, validUtf8: true, findings };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const files = [...new Set(options.roots.flatMap((root) => walk(root, options)))].sort();
  const results = files.map((file) => checkFile(file, options));
  const failed = results.filter((result) => !result.validUtf8 || result.findings.length > 0);

  if (options.json) {
    console.log(JSON.stringify({ checked: files.length, failed }, null, 2));
  } else if (failed.length === 0) {
    console.log(`Encoding check passed (${files.length} files).`);
  } else {
    console.error(`Encoding check found ${failed.length} file(s) needing review (${files.length} checked):`);
    for (const result of failed) {
      console.error(`- ${result.file}`);
      for (const finding of result.findings) {
        const where = finding.line ? `:${finding.line}:${finding.column}` : "";
        console.error(`  ${finding.type}${where} ${finding.sample ?? finding.message ?? ""}`.trimEnd());
      }
    }
  }

  process.exitCode = failed.length === 0 ? 0 : 1;
}

main();
