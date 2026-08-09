import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const clientRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readClientFile = (relativePath) => readFileSync(join(clientRoot, relativePath), "utf8");

const novelCreate = readClientFile("src/pages/novels/NovelCreate.tsx");
const novelBasicInfoShared = readClientFile("src/pages/novels/novelBasicInfo.shared.ts");

test("novel creation exposes long novel template guidance", () => {
  assert.match(novelCreate, /LongNovelTemplatePicker/);
  assert.match(novelCreate, /LongNovelMainlinePreview/);
  assert.match(novelCreate, /longNovelTemplateId/);
});

test("novel basic form carries the selected long novel template id", () => {
  assert.match(novelBasicInfoShared, /longNovelTemplateId/);
  assert.match(novelBasicInfoShared, /longNovelTemplateId:\s*"custom"/);
});

test("template guidance rules protect user text and clean custom fallback", () => {
  assert.match(novelBasicInfoShared, /buildLongNovelTemplatePatch/);
  assert.match(novelBasicInfoShared, /TEMPLATE_GUIDANCE_PREFIX/);
  assert.match(novelBasicInfoShared, /startsWith\(TEMPLATE_GUIDANCE_PREFIX\)/);
  assert.match(novelBasicInfoShared, /longNovelTemplateId === "custom"/);
  assert.match(novelBasicInfoShared, /description:\s*clearTemplateGuidance\(previous\.description\)/);
  assert.match(novelBasicInfoShared, /bookSellingPoint:\s*clearTemplateGuidance\(previous\.bookSellingPoint\)/);
  assert.match(novelBasicInfoShared, /first30ChapterPromise:\s*clearTemplateGuidance\(previous\.first30ChapterPromise\)/);
  assert.match(novelCreate, /buildLongNovelTemplatePatch/);
});
