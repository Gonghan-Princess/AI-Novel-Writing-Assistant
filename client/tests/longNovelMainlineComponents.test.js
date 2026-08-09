import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const componentHooks = [
  {
    file: "client/src/pages/novels/components/LongNovelTemplatePicker.tsx",
    hook: "long-novel-template-picker",
  },
  {
    file: "client/src/pages/novels/components/LongNovelMainlinePreview.tsx",
    hook: "long-novel-mainline-preview",
  },
  {
    file: "client/src/pages/novels/components/LongNovelMainlineStatusPanel.tsx",
    hook: "long-novel-mainline-status",
  },
  {
    file: "client/src/pages/novels/components/chapterEditor/ChapterProductionContinuityCard.tsx",
    hook: "chapter-production-continuity-card",
  },
];

test("long novel mainline components expose stable class hooks", () => {
  for (const { file, hook } of componentHooks) {
    const source = readFileSync(join(process.cwd(), file), "utf8");

    assert.match(source, new RegExp(`\\b${hook}\\b`), `${file} should expose ${hook}`);
  }
});
