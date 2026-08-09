import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildLongNovelTemplatePatch,
  createDefaultNovelBasicFormState,
  patchNovelBasicForm,
  TEMPLATE_GUIDANCE_PREFIX,
} from "../src/pages/novels/novelBasicInfo.shared.ts";

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

test("template guidance source exposes the reusable form rule", () => {
  assert.match(novelBasicInfoShared, /buildLongNovelTemplatePatch/);
  assert.match(novelBasicInfoShared, /TEMPLATE_GUIDANCE_PREFIX/);
  assert.match(novelCreate, /buildLongNovelTemplatePatch/);
});

test("template guidance fills empty fields for a selected template", () => {
  const base = createDefaultNovelBasicFormState();
  const patch = buildLongNovelTemplatePatch(base, "fantasy");

  assert.equal(patch.longNovelTemplateId, "fantasy");
  assert.match(patch.description, new RegExp(`^${TEMPLATE_GUIDANCE_PREFIX}`));
  assert.match(patch.bookSellingPoint, new RegExp(`^${TEMPLATE_GUIDANCE_PREFIX}`));
  assert.match(patch.first30ChapterPromise, new RegExp(`^${TEMPLATE_GUIDANCE_PREFIX}`));
});

test("template guidance does not overwrite user-authored text", () => {
  const base = {
    ...createDefaultNovelBasicFormState(),
    description: "我要自己定义这本书的简介",
    bookSellingPoint: "主卖点由我手写",
    first30ChapterPromise: "前三十章承诺也由我决定",
  };
  const patch = buildLongNovelTemplatePatch(base, "mystery");

  assert.equal(patch.longNovelTemplateId, "mystery");
  assert.equal(patch.description, undefined);
  assert.equal(patch.bookSellingPoint, undefined);
  assert.equal(patch.first30ChapterPromise, undefined);
});

test("template guidance replaces previous template text and cleans custom fallback", () => {
  const base = createDefaultNovelBasicFormState();
  const fantasyState = patchNovelBasicForm(base, buildLongNovelTemplatePatch(base, "fantasy"));
  const mysteryPatch = buildLongNovelTemplatePatch(fantasyState, "mystery");
  const mysteryState = patchNovelBasicForm(fantasyState, mysteryPatch);
  const customPatch = buildLongNovelTemplatePatch(mysteryState, "custom");

  assert.equal(mysteryPatch.longNovelTemplateId, "mystery");
  assert.match(mysteryPatch.description, /^模板指导：/);
  assert.notEqual(mysteryPatch.description, fantasyState.description);
  assert.deepEqual(customPatch, {
    longNovelTemplateId: "custom",
    description: "",
    bookSellingPoint: "",
    first30ChapterPromise: "",
  });
});
