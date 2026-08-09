import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..", "..");
const templateSource = readFileSync(
  resolve(repoRoot, "shared", "types", "longNovelTemplate.ts"),
  "utf8",
);
const sharedIndexSource = readFileSync(resolve(repoRoot, "shared", "index.ts"), "utf8");

test("long novel template registry includes the first shared template ids", () => {
  const expectedTemplateIds = [
    "fantasy",
    "urban_realist",
    "science_fiction",
    "mystery",
    "historical",
    "romance",
    "adventure_growth",
    "custom",
  ];

  for (const templateId of expectedTemplateIds) {
    assert.match(templateSource, new RegExp(`id:\\s*"${templateId}"`));
  }
});

test("long novel templates expose shared automation guidance fields", () => {
  const expectedFields = [
    "name",
    "shortLabel",
    "openingQuestions",
    "planningFocus",
    "worldbuildingPrompts",
    "characterPrompts",
    "reviewFocus",
    "automationAdvice",
  ];

  for (const field of expectedFields) {
    assert.match(templateSource, new RegExp(`${field}\\??:`));
  }
});

test("shared package exports the long novel template registry", () => {
  assert.match(sharedIndexSource, /export \* from "\.\/types\/longNovelTemplate";/);
});
