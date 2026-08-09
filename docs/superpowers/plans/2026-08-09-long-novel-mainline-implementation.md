# Long Novel Mainline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build phase 1 of the general long-novel automation mainline while preserving the existing Gonghan Novel Studio product base and public interfaces.

**Architecture:** Add shared type-template configuration and workflow explanation helpers first, then compose them into existing React pages. Backend changes are avoided in phase 1 unless implementation proves an existing page cannot assemble the required state from current data.

**Tech Stack:** pnpm workspace, TypeScript, React, Vite, TanStack Query, Node test runner, existing UI components, shared package exports.

---

## File Structure

- Create `shared/types/longNovelTemplate.ts`: shared template types and first batch of general long-novel templates.
- Modify `shared/index.ts`: export the new shared template module.
- Create `client/tests/longNovelTemplates.test.js`: Node contract test for template coverage and stable ids.
- Modify `client/src/lib/novelWorkflowTaskUi.ts`: add a user-facing workflow explanation object and helper.
- Modify `client/tests/novelWorkflowTaskUi.test.js`: cover checkpoint explanations and recommended routes.
- Create `client/src/pages/novels/components/LongNovelTemplatePicker.tsx`: reusable template picker for the create flow.
- Create `client/src/pages/novels/components/LongNovelMainlinePreview.tsx`: create-flow preview of how the selected template will drive the book.
- Create `client/src/pages/novels/components/LongNovelMainlineStatusPanel.tsx`: single-book mainline status panel.
- Create `client/src/pages/novels/components/chapterEditor/ChapterProductionContinuityCard.tsx`: chapter-level closed-loop summary card.
- Modify `client/src/pages/Home.tsx`: make the long-novel automation path the primary cockpit action.
- Modify `client/src/pages/novels/NovelCreate.tsx`: add template-driven wizard shell and seed selected template into the existing form.
- Modify `client/src/pages/novels/components/NovelEditView.tsx`: mount the mainline status panel above the desktop workspace.
- Modify `client/src/pages/novels/mobile/MobileNovelEditView.tsx`: surface the same mainline state compactly on mobile.
- Modify `client/src/pages/autoDirectorFollowUps/components/AutoDirectorFollowUpDetail.tsx`: show checkpoint explanation near action controls.
- Modify `client/src/pages/novels/NovelChapterEdit.tsx`: pass continuity context into the chapter editor shell where available.
- Modify `client/src/pages/novels/components/chapterEditor/ChapterEditorShell.tsx`: render the continuity card without changing save/generation behavior.
- Modify `client/tests/mobilePageContracts.test.js`: assert mobile accessibility for the new mainline elements.
- Modify `client/tests/mobileSiteNavigation.test.js` if the home/create route contract needs new route labels.
- Modify `docs/wiki/product/beginner-first-novel-completion.md`: add the durable product rule for the general long-novel mainline.
- Modify `docs/releases/release-notes.md` and `README.md` during the final implementation commit only if the code diff changes user-visible behavior, following the existing readme-release-updater workflow.

---

### Task 1: Shared Long-Novel Template Registry

**Files:**
- Create: `shared/types/longNovelTemplate.ts`
- Modify: `shared/index.ts`
- Test: `client/tests/longNovelTemplates.test.js`

- [ ] **Step 1: Write the failing template contract test**

Create `client/tests/longNovelTemplates.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const templateFile = readFileSync(join(repoRoot, "shared/types/longNovelTemplate.ts"), "utf8");
const sharedIndex = readFileSync(join(repoRoot, "shared/index.ts"), "utf8");

test("long novel template registry exposes the first general template batch", () => {
  [
    "fantasy",
    "urban_realist",
    "science_fiction",
    "mystery",
    "historical",
    "romance",
    "adventure_growth",
    "custom",
  ].forEach((id) => {
    assert.match(templateFile, new RegExp(`id:\\s*"${id}"`), `${id} should be registered`);
  });
});

test("long novel templates include production and review guidance", () => {
  [
    "planningFocus",
    "worldbuildingPrompts",
    "characterPrompts",
    "reviewFocus",
    "automationAdvice",
  ].forEach((field) => {
    assert.match(templateFile, new RegExp(`${field}:\\s*\\[`), `${field} should be a filled list`);
  });
  assert.match(sharedIndex, /longNovelTemplate/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test client/tests/longNovelTemplates.test.js
```

Expected: FAIL because `shared/types/longNovelTemplate.ts` does not exist.

- [ ] **Step 3: Implement shared template registry**

Create `shared/types/longNovelTemplate.ts`:

```ts
export type LongNovelTemplateId =
  | "fantasy"
  | "urban_realist"
  | "science_fiction"
  | "mystery"
  | "historical"
  | "romance"
  | "adventure_growth"
  | "custom";

export type LongNovelTemplate = {
  id: LongNovelTemplateId;
  name: string;
  shortLabel: string;
  description: string;
  openingQuestions: string[];
  planningFocus: string[];
  worldbuildingPrompts: string[];
  characterPrompts: string[];
  reviewFocus: string[];
  automationAdvice: string;
};

export const LONG_NOVEL_TEMPLATES: readonly LongNovelTemplate[] = [
  {
    id: "fantasy",
    name: "玄幻 / 奇幻",
    shortLabel: "规则与升级",
    description: "适合需要清晰世界规则、力量体系、地图层级和势力冲突的长篇。",
    openingQuestions: ["主角为什么必须进入更大的世界？", "力量体系的边界和代价是什么？"],
    planningFocus: ["力量体系一致性", "地图层级推进", "势力冲突升级", "阶段奖励与代价"],
    worldbuildingPrompts: ["世界规则", "力量等级", "地图层级", "势力边界"],
    characterPrompts: ["主角成长门槛", "导师或对手功能", "伙伴关系变化"],
    reviewFocus: ["升级是否有代价", "规则是否前后一致", "冲突是否推动主线"],
    automationAdvice: "适合开启自动导演规划到章节任务单，再逐章检查规则一致性。",
  },
  {
    id: "urban_realist",
    name: "都市 / 现实",
    shortLabel: "身份与资源",
    description: "适合围绕职业、社会关系、资源目标和现实约束推进的长篇。",
    openingQuestions: ["主角在现实秩序里的目标是什么？", "主角要改变哪种关系或资源处境？"],
    planningFocus: ["职业身份", "社会关系", "现实约束", "阶段目标"],
    worldbuildingPrompts: ["城市环境", "行业规则", "资源结构", "社会压力"],
    characterPrompts: ["职业动机", "关系网位置", "现实困境"],
    reviewFocus: ["行为是否符合现实约束", "资源变化是否可追踪", "关系推进是否可信"],
    automationAdvice: "适合保留关键节点人工确认，避免现实逻辑被自动化推进冲散。",
  },
  {
    id: "science_fiction",
    name: "科幻",
    shortLabel: "假设与危机",
    description: "适合从技术假设、世界变更点、伦理冲突和危机升级展开的长篇。",
    openingQuestions: ["核心技术或世界变更点是什么？", "它改变了谁的命运和秩序？"],
    planningFocus: ["技术假设边界", "伦理冲突", "危机升级", "探索结构"],
    worldbuildingPrompts: ["技术边界", "社会变化", "危机来源", "探索空间"],
    characterPrompts: ["认知变化", "抉择代价", "专业能力"],
    reviewFocus: ["技术假设是否稳定", "危机是否由设定自然推出", "解释是否压过剧情"],
    automationAdvice: "适合让自动导演先固化设定边界，再进入章节生产。",
  },
  {
    id: "mystery",
    name: "悬疑 / 推理",
    shortLabel: "线索与回收",
    description: "适合核心谜题、公平线索、误导、揭示节奏和真相回收驱动的长篇。",
    openingQuestions: ["核心谜题是什么？", "读者最早可以看到哪些公平线索？"],
    planningFocus: ["谜题结构", "公平线索", "误导设计", "揭示节奏"],
    worldbuildingPrompts: ["案件环境", "规则限制", "信息封锁", "风险边界"],
    characterPrompts: ["调查动机", "嫌疑关系", "隐藏信息"],
    reviewFocus: ["线索是否可回看", "误导是否公平", "真相是否能回收前文"],
    automationAdvice: "适合降低全自动程度，在关键揭示点保留人工确认。",
  },
  {
    id: "historical",
    name: "历史 / 架空",
    shortLabel: "制度与立场",
    description: "适合时代秩序、制度限制、势力博弈和人物立场驱动的长篇。",
    openingQuestions: ["故事处于怎样的时代秩序？", "主角的立场和代价是什么？"],
    planningFocus: ["制度限制", "势力博弈", "人物立场", "时代压力"],
    worldbuildingPrompts: ["时代秩序", "制度规则", "地域势力", "礼法边界"],
    characterPrompts: ["身份约束", "政治立场", "家族或阵营关系"],
    reviewFocus: ["制度压力是否影响选择", "势力关系是否稳定", "人物行为是否符合立场"],
    automationAdvice: "适合先准备世界和势力，再进入卷规划。",
  },
  {
    id: "romance",
    name: "言情 / 情感",
    shortLabel: "关系与阻力",
    description: "适合关系推进、情感阻力、亲密度变化和关系代价驱动的长篇。",
    openingQuestions: ["核心关系为什么难以靠近？", "关系推进会带来什么代价？"],
    planningFocus: ["关系推进", "情感阻力", "亲密度变化", "关系代价"],
    worldbuildingPrompts: ["关系环境", "身份差异", "外部阻力", "承诺边界"],
    characterPrompts: ["情感需求", "关系恐惧", "靠近方式"],
    reviewFocus: ["关系是否有真实变化", "误会是否服务推进", "情感选择是否有代价"],
    automationAdvice: "适合自动规划关系节奏，但关键关系转折建议人工确认。",
  },
  {
    id: "adventure_growth",
    name: "冒险 / 成长",
    shortLabel: "旅程与挑战",
    description: "适合目标旅程、阶段挑战、伙伴变化、奖励和代价驱动的长篇。",
    openingQuestions: ["主角为什么必须出发？", "每一阶段会获得什么也失去什么？"],
    planningFocus: ["旅程目标", "阶段挑战", "伙伴变化", "奖励与代价"],
    worldbuildingPrompts: ["旅程地图", "阶段区域", "挑战机制", "奖励结构"],
    characterPrompts: ["成长缺口", "伙伴功能", "阶段选择"],
    reviewFocus: ["旅程是否持续推进", "挑战是否升级", "成长是否可见"],
    automationAdvice: "适合使用范围执行，先验证一卷再扩大自动化范围。",
  },
  {
    id: "custom",
    name: "其他 / 自定义",
    shortLabel: "通用主线",
    description: "适合不想预设类型，但仍希望保留长篇生产主线的作品。",
    openingQuestions: ["这本书最重要的长期问题是什么？", "读者持续追读的理由是什么？"],
    planningFocus: ["核心主线", "角色动机", "世界边界", "章节目标"],
    worldbuildingPrompts: ["故事边界", "长期规则", "关键资源", "风险来源"],
    characterPrompts: ["主角目标", "关系网络", "反对力量"],
    reviewFocus: ["主线是否清晰", "章节是否推进", "资产是否回灌"],
    automationAdvice: "适合保留更多人工输入，再让自动导演补足结构。",
  },
];

export function getLongNovelTemplate(id: string | null | undefined): LongNovelTemplate {
  return LONG_NOVEL_TEMPLATES.find((item) => item.id === id) ?? LONG_NOVEL_TEMPLATES[LONG_NOVEL_TEMPLATES.length - 1];
}
```

Modify `shared/index.ts`:

```ts
export * from "./types/longNovelTemplate";
```

Add the export near the other `types/*` exports.

- [ ] **Step 4: Run test and shared build**

Run:

```powershell
node --test client/tests/longNovelTemplates.test.js
corepack pnpm --filter @ai-novel/shared build
```

Expected: PASS and TypeScript build succeeds.

- [ ] **Step 5: Commit**

```powershell
git add shared/types/longNovelTemplate.ts shared/index.ts client/tests/longNovelTemplates.test.js
git commit -m "feat: add long novel template registry"
```

---

### Task 2: Workflow Explanation Helper

**Files:**
- Modify: `client/src/lib/novelWorkflowTaskUi.ts`
- Modify: `client/tests/novelWorkflowTaskUi.test.js`

- [ ] **Step 1: Write failing explanation assertions**

Append tests to `client/tests/novelWorkflowTaskUi.test.js` using the file's existing import style. Add assertions for:

```js
assert.equal(
  getWorkflowExplanation({
    id: "task-1",
    status: "waiting_approval",
    checkpointType: "candidate_selection_required",
    progress: 0.4,
  }).recommendedAction,
  "选择一套书级方向",
);

assert.equal(
  getWorkflowExplanation({
    id: "task-2",
    status: "waiting_approval",
    checkpointType: "chapter_batch_ready",
    executionScopeLabel: "第 1-10 章",
    progress: 1,
  }).route,
  "/tasks?kind=novel_workflow&id=task-2",
);

assert.equal(
  getWorkflowExplanation({
    id: "task-3",
    status: "waiting_approval",
    checkpointType: "replan_required",
    progress: 0.8,
  }).riskLevel,
  "high",
);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test client/tests/novelWorkflowTaskUi.test.js
```

Expected: FAIL because `getWorkflowExplanation` is not exported.

- [ ] **Step 3: Implement explanation helper**

Add to `client/src/lib/novelWorkflowTaskUi.ts`:

```ts
export type WorkflowRiskLevel = "none" | "low" | "medium" | "high";

export type WorkflowExplanation = {
  stage: string;
  summary: string;
  pauseReason: string;
  recommendedAction: string;
  route: string;
  riskLevel: WorkflowRiskLevel;
  canAutoContinue: boolean;
};

export function getWorkflowExplanation(task?: NovelAutoDirectorTaskSummary | null): WorkflowExplanation {
  if (!task) {
    return {
      stage: "尚未启动",
      summary: "这本书还没有进入自动导演主线。",
      pauseReason: "没有正在跟进的自动导演任务。",
      recommendedAction: "从新建或单书工作台启动自动导演",
      route: "/novels/create?mode=director",
      riskLevel: "none",
      canAutoContinue: false,
    };
  }

  if (task.checkpointType === "candidate_selection_required") {
    return {
      stage: "书级方向确认",
      summary: "系统已经准备好候选方向，需要先选定这本书的主方向。",
      pauseReason: "等待你确认书级方向。",
      recommendedAction: "选择一套书级方向",
      route: getCandidateSelectionLink(task.id),
      riskLevel: "low",
      canAutoContinue: false,
    };
  }

  if (task.checkpointType === "character_setup_required") {
    return {
      stage: "角色阵容确认",
      summary: "系统已经生成角色阵容，需要确认核心身份和关系网。",
      pauseReason: "等待你确认角色准备结果。",
      recommendedAction: "确认角色阵容并继续",
      route: getTaskCenterLink(task.id),
      riskLevel: "low",
      canAutoContinue: true,
    };
  }

  if (task.checkpointType === "chapter_batch_ready") {
    return {
      stage: "章节批次就绪",
      summary: `${getExecutionScopeLabel(task.executionScopeLabel)}已经准备好，可以进入正文生产。`,
      pauseReason: "章节任务单已经就绪，等待继续执行。",
      recommendedAction: "进入章节生产或继续自动执行",
      route: getTaskCenterLink(task.id),
      riskLevel: task.status === "failed" ? "medium" : "low",
      canAutoContinue: task.status === "waiting_approval" || task.status === "failed" || task.status === "cancelled",
    };
  }

  if (task.checkpointType === "replan_required") {
    return {
      stage: "规划风险处理",
      summary: "当前质量或规划风险较高，需要决定修复、记录质量债务或重规划。",
      pauseReason: task.blockingReason?.trim() || "系统判断继续前需要处理风险。",
      recommendedAction: "查看风险并选择处理方式",
      route: getTaskCenterLink(task.id),
      riskLevel: "high",
      canAutoContinue: false,
    };
  }

  if (task.checkpointType === "workflow_completed") {
    return {
      stage: "目标范围完成",
      summary: "当前自动导演目标范围已经完成，可以查看产物或继续下一批章节。",
      pauseReason: "没有阻塞项。",
      recommendedAction: "查看章节和资产",
      route: getTaskCenterLink(task.id),
      riskLevel: "none",
      canAutoContinue: false,
    };
  }

  if (task.status === "failed") {
    return {
      stage: "任务异常",
      summary: "自动导演任务遇到异常，需要先查看任务详情。",
      pauseReason: task.blockingReason?.trim() || "后台任务失败。",
      recommendedAction: "打开任务中心查看并重试",
      route: getTaskCenterLink(task.id),
      riskLevel: "medium",
      canAutoContinue: false,
    };
  }

  return {
    stage: formatWorkflowCheckpoint(task.checkpointType, task.executionScopeLabel),
    summary: getWorkflowDescription(task) ?? "系统正在推进这本书的自动化生产主线。",
    pauseReason: task.status === "running" || task.status === "queued" ? "后台任务正在运行。" : "等待下一步处理。",
    recommendedAction: task.nextActionLabel?.trim() || task.resumeAction?.trim() || "查看任务详情",
    route: getTaskCenterLink(task.id),
    riskLevel: "low",
    canAutoContinue: canContinueDirector(task),
  };
}
```

- [ ] **Step 4: Run focused tests**

Run:

```powershell
node --test client/tests/novelWorkflowTaskUi.test.js
corepack pnpm --filter @ai-novel/client test -- novelWorkflowTaskUi
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add client/src/lib/novelWorkflowTaskUi.ts client/tests/novelWorkflowTaskUi.test.js
git commit -m "feat: explain novel workflow checkpoints"
```

---

### Task 3: Reusable Mainline UI Components

**Files:**
- Create: `client/src/pages/novels/components/LongNovelTemplatePicker.tsx`
- Create: `client/src/pages/novels/components/LongNovelMainlinePreview.tsx`
- Create: `client/src/pages/novels/components/LongNovelMainlineStatusPanel.tsx`
- Create: `client/src/pages/novels/components/chapterEditor/ChapterProductionContinuityCard.tsx`
- Test: `client/tests/longNovelMainlineComponents.test.js`

- [ ] **Step 1: Write static component contract test**

Create `client/tests/longNovelMainlineComponents.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const clientRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readClientFile = (relativePath) => readFileSync(join(clientRoot, relativePath), "utf8");

test("mainline UI components expose stable styling hooks", () => {
  const picker = readClientFile("src/pages/novels/components/LongNovelTemplatePicker.tsx");
  const preview = readClientFile("src/pages/novels/components/LongNovelMainlinePreview.tsx");
  const status = readClientFile("src/pages/novels/components/LongNovelMainlineStatusPanel.tsx");
  const chapter = readClientFile("src/pages/novels/components/chapterEditor/ChapterProductionContinuityCard.tsx");

  assert.match(picker, /long-novel-template-picker/);
  assert.match(preview, /long-novel-mainline-preview/);
  assert.match(status, /long-novel-mainline-status/);
  assert.match(chapter, /chapter-production-continuity-card/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test client/tests/longNovelMainlineComponents.test.js
```

Expected: FAIL because the new files do not exist.

- [ ] **Step 3: Implement `LongNovelTemplatePicker.tsx`**

Use `LONG_NOVEL_TEMPLATES` from `@ai-novel/shared/types/longNovelTemplate`. Props:

```ts
import type { LongNovelTemplateId } from "@ai-novel/shared/types/longNovelTemplate";

type LongNovelTemplatePickerProps = {
  value: LongNovelTemplateId;
  onChange: (id: LongNovelTemplateId) => void;
};
```

Render a responsive grid of buttons/cards. Each card shows `name`, `shortLabel`, `description`, and the first three `planningFocus` items. Selected card uses `aria-pressed={true}` and a visible border state. Use existing `Card`, `Badge`, and `Button` components.

- [ ] **Step 4: Implement `LongNovelMainlinePreview.tsx`**

Props:

```ts
import type { LongNovelTemplate } from "@ai-novel/shared/types/longNovelTemplate";

type LongNovelMainlinePreviewProps = {
  template: LongNovelTemplate;
  inspiration: string;
  automationLabel: string;
};
```

Render six ordered steps: 类型定位、书级契约、世界角色、卷与章纲、正文生产、审稿回灌. Pull concrete hints from `template.openingQuestions`, `template.worldbuildingPrompts`, `template.characterPrompts`, and `template.reviewFocus`.

- [ ] **Step 5: Implement `LongNovelMainlineStatusPanel.tsx`**

Props:

```ts
import type { NovelAutoDirectorTaskSummary } from "@ai-novel/shared/types/novel";

type LongNovelMainlineStatusPanelProps = {
  novelTitle: string;
  task?: NovelAutoDirectorTaskSummary | null;
  currentPageLabel: string;
  onOpenRoute: (route: string) => void;
};
```

Call `getWorkflowExplanation(task)` and render stage, summary, pause reason, recommended action, route button, and risk badge. Use class hook `long-novel-mainline-status`.

- [ ] **Step 6: Implement `ChapterProductionContinuityCard.tsx`**

Props:

```ts
type ChapterProductionContinuityCardProps = {
  hasContent: boolean;
  taskSheetReady: boolean;
  reviewReady: boolean;
  repairReady: boolean;
  stateSynced: boolean;
};
```

Render five compact items: 任务单、正文、审稿、修复、回灌. Each item shows ready/pending copy from the user perspective. Use class hook `chapter-production-continuity-card`.

- [ ] **Step 7: Run component test and client typecheck**

Run:

```powershell
node --test client/tests/longNovelMainlineComponents.test.js
corepack pnpm --filter @ai-novel/client typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add client/src/pages/novels/components/LongNovelTemplatePicker.tsx client/src/pages/novels/components/LongNovelMainlinePreview.tsx client/src/pages/novels/components/LongNovelMainlineStatusPanel.tsx client/src/pages/novels/components/chapterEditor/ChapterProductionContinuityCard.tsx client/tests/longNovelMainlineComponents.test.js
git commit -m "feat: add long novel mainline components"
```

---

### Task 4: Home Cockpit Mainline Entry

**Files:**
- Modify: `client/src/pages/Home.tsx`
- Modify: `client/tests/mobilePageContracts.test.js`

- [ ] **Step 1: Add failing home contract assertions**

In `client/tests/mobilePageContracts.test.js`, add assertions to the home test:

```js
assert.match(homePage, /long-novel-home-mainline/);
assert.match(homePage, /开始一部长篇小说/);
assert.match(homePage, /继续最近的作品/);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test client/tests/mobilePageContracts.test.js
```

Expected: FAIL because the home page lacks the new class hook.

- [ ] **Step 3: Update home primary cockpit area**

Modify `client/src/pages/Home.tsx` so the top action block includes:

- class hook `long-novel-home-mainline`
- primary link to `/novels/create?mode=director`
- secondary action for the current `primaryNovel`, routing to `/novels/${primaryNovel.id}/edit`
- action-required link to `/auto-director/follow-ups`
- task center link to `/tasks`

Keep existing metrics and recent-project logic. Do not remove existing API calls.

- [ ] **Step 4: Run home/mobile tests**

Run:

```powershell
node --test client/tests/mobilePageContracts.test.js client/tests/internalNavigation.test.js
corepack pnpm --filter @ai-novel/client test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add client/src/pages/Home.tsx client/tests/mobilePageContracts.test.js
git commit -m "feat: focus home on long novel mainline"
```

---

### Task 5: Template-Driven Novel Create Flow

**Files:**
- Modify: `client/src/pages/novels/NovelCreate.tsx`
- Modify: `client/src/pages/novels/novelBasicInfo.shared.ts`
- Test: `client/tests/longNovelCreateFlow.test.js`

- [ ] **Step 1: Write static create-flow test**

Create `client/tests/longNovelCreateFlow.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const clientRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const createPage = readFileSync(join(clientRoot, "src/pages/novels/NovelCreate.tsx"), "utf8");
const basicInfo = readFileSync(join(clientRoot, "src/pages/novels/novelBasicInfo.shared.ts"), "utf8");

test("novel create page mounts the template-driven mainline flow", () => {
  assert.match(createPage, /LongNovelTemplatePicker/);
  assert.match(createPage, /LongNovelMainlinePreview/);
  assert.match(createPage, /longNovelTemplateId/);
  assert.match(basicInfo, /longNovelTemplateId/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test client/tests/longNovelCreateFlow.test.js
```

Expected: FAIL because the create flow does not yet reference the template picker.

- [ ] **Step 3: Extend basic form state compatibly**

In `client/src/pages/novels/novelBasicInfo.shared.ts`, add optional-compatible `longNovelTemplateId` to the form state and payload seed. Default to `"custom"` if no selection exists. Do not send a new required backend field unless an existing flexible metadata field is already available in `buildNovelCreatePayload`.

Use this pattern:

```ts
longNovelTemplateId: "custom",
```

When building existing title/description/framing strings, append template guidance into current text fields only when the user has not already supplied stronger values.

- [ ] **Step 4: Mount picker and preview in `NovelCreate.tsx`**

Import:

```ts
import { getLongNovelTemplate, type LongNovelTemplateId } from "@ai-novel/shared/types/longNovelTemplate";
import LongNovelTemplatePicker from "./components/LongNovelTemplatePicker";
import LongNovelMainlinePreview from "./components/LongNovelMainlinePreview";
```

Add state derived from `basicForm.longNovelTemplateId`, render picker above `NovelBasicInfoForm`, and render preview before the automatic director dialog area. On template change, patch:

```ts
onFormChange({
  longNovelTemplateId: id,
  bookFraming: nextFramingText,
})
```

`nextFramingText` should include the selected template's planning and review focus without overwriting a non-empty user-authored framing block. If the exact form field name differs, use the existing form field that stores book framing or high-level description.

- [ ] **Step 5: Run create-flow checks**

Run:

```powershell
node --test client/tests/longNovelCreateFlow.test.js client/tests/mobilePageContracts.test.js
corepack pnpm --filter @ai-novel/client typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add client/src/pages/novels/NovelCreate.tsx client/src/pages/novels/novelBasicInfo.shared.ts client/tests/longNovelCreateFlow.test.js
git commit -m "feat: add template guided novel creation"
```

---

### Task 6: Single-Book Mainline Status Panel

**Files:**
- Modify: `client/src/pages/novels/components/NovelEditView.tsx`
- Modify: `client/src/pages/novels/mobile/MobileNovelEditView.tsx`
- Test: `client/tests/mobilePageContracts.test.js`
- Test: `client/src/pages/novels/novelEditAutomationStatus.test.mjs`

- [ ] **Step 1: Add failing status-panel assertions**

Add assertions:

```js
assert.match(novelEditView, /LongNovelMainlineStatusPanel/);
assert.match(mobileNovelEditView, /long-novel-mainline-status/);
```

Use the existing files already loaded by `client/tests/mobilePageContracts.test.js`.

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test client/tests/mobilePageContracts.test.js
```

Expected: FAIL because the status panel is not mounted.

- [ ] **Step 3: Mount desktop panel**

In `client/src/pages/novels/components/NovelEditView.tsx`, import `LongNovelMainlineStatusPanel` and mount it after the top compact breadcrumb/status row. Pass:

- `novelTitle`
- `taskDrawer?.task ?? basicTab.novel?.latestAutoDirectorTask ?? null` if available
- `currentPageLabel`
- `onOpenRoute={(route) => navigate(route)}`; if this component does not currently have `navigate`, add `useNavigate` from `react-router-dom`

- [ ] **Step 4: Mount mobile compact panel**

In `client/src/pages/novels/mobile/MobileNovelEditView.tsx`, mount the same component inside the mobile workspace header area, preserving existing `MobileAutoDirectorStatusCard`.

- [ ] **Step 5: Run focused tests**

Run:

```powershell
node --test client/tests/mobilePageContracts.test.js client/src/pages/novels/novelEditAutomationStatus.test.mjs
corepack pnpm --filter @ai-novel/client typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add client/src/pages/novels/components/NovelEditView.tsx client/src/pages/novels/mobile/MobileNovelEditView.tsx client/tests/mobilePageContracts.test.js client/src/pages/novels/novelEditAutomationStatus.test.mjs
git commit -m "feat: show single book mainline status"
```

---

### Task 7: Follow-Up and Chapter Production Explanations

**Files:**
- Modify: `client/src/pages/autoDirectorFollowUps/components/AutoDirectorFollowUpDetail.tsx`
- Modify: `client/src/pages/novels/NovelChapterEdit.tsx`
- Modify: `client/src/pages/novels/components/chapterEditor/ChapterEditorShell.tsx`
- Test: `client/tests/mobilePageContracts.test.js`

- [ ] **Step 1: Add failing static assertions**

In `client/tests/mobilePageContracts.test.js`, add:

```js
const autoDirectorFollowUpDetail = readFileSync(
  join(clientRoot, "src/pages/autoDirectorFollowUps/components/AutoDirectorFollowUpDetail.tsx"),
  "utf8",
);
const chapterEditorShell = readFileSync(
  join(clientRoot, "src/pages/novels/components/chapterEditor/ChapterEditorShell.tsx"),
  "utf8",
);

assert.match(autoDirectorFollowUpDetail, /getWorkflowExplanation/);
assert.match(chapterEditorShell, /ChapterProductionContinuityCard/);
```

Place the file reads near existing file reads and the assertions in appropriate tests or a new test.

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test client/tests/mobilePageContracts.test.js
```

Expected: FAIL because the follow-up detail and chapter editor shell do not yet use the new components.

- [ ] **Step 3: Add follow-up checkpoint explanation**

In `AutoDirectorFollowUpDetail.tsx`, derive a task-like object from the selected follow-up detail. If the detail does not expose enough fields, use the list item fields already available in the component props. Call `getWorkflowExplanation` and render:

- stage
- pause reason
- recommended action
- risk level badge

Do not change mutation actions, batch behavior, or navigation resolution.

- [ ] **Step 4: Add chapter continuity card**

In `ChapterEditorShell.tsx`, render `ChapterProductionContinuityCard` near the existing director/runtime panel. Compute:

- `hasContent`: current chapter content is non-empty
- `taskSheetReady`: workspace has task sheet or plan data
- `reviewReady`: workspace has review/audit data
- `repairReady`: workspace has repair guidance or patch plan
- `stateSynced`: workspace indicates saved runtime package or final sync, or fallback to `hasContent && reviewReady`

If exact property names differ, inspect `ChapterEditorShell` props and use the nearest existing workspace fields; keep the computation local and deterministic.

- [ ] **Step 5: Run checks**

Run:

```powershell
node --test client/tests/mobilePageContracts.test.js
corepack pnpm --filter @ai-novel/client typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add client/src/pages/autoDirectorFollowUps/components/AutoDirectorFollowUpDetail.tsx client/src/pages/novels/NovelChapterEdit.tsx client/src/pages/novels/components/chapterEditor/ChapterEditorShell.tsx client/tests/mobilePageContracts.test.js
git commit -m "feat: explain follow-up and chapter production state"
```

---

### Task 8: Documentation, Release Notes, and Unified Verification

**Files:**
- Modify: `docs/wiki/product/beginner-first-novel-completion.md`
- Modify: `docs/releases/release-notes.md` if user-visible behavior changed
- Modify: `README.md` if release notes changed

- [ ] **Step 1: Update durable product wiki**

Add a section to `docs/wiki/product/beginner-first-novel-completion.md`:

```md
## 通用长篇主线优先

长篇自动化主线应保持题材通用，不绑定单一平台、性别向或类型。类型模板用于降低新手开书难度，提供默认问题、规划重点和审稿关注点，但不能把作品锁死在模板规则里。

前端主入口应持续回答三个问题：这本书当前在哪一步、下一步该去哪里、继续后会影响哪些长期资产。底层任务状态可以保留技术字段，但产品界面必须优先展示用户能执行的动作。
```

- [ ] **Step 2: Run readme-release-updater workflow**

Inspect:

```powershell
git status --short
git diff --stat
```

Because this implementation changes user-visible flow, update `docs/releases/release-notes.md` under `### 2026-08-09` and refresh the latest update block in `README.md` using date-based format. The release summary should describe the new long-novel mainline entry, template-guided creation, and clearer workflow recovery.

- [ ] **Step 3: Run unified verification**

Run:

```powershell
node --test client/tests/longNovelTemplates.test.js client/tests/longNovelMainlineComponents.test.js client/tests/longNovelCreateFlow.test.js client/tests/novelWorkflowTaskUi.test.js client/tests/mobilePageContracts.test.js
corepack pnpm --filter @ai-novel/shared build
corepack pnpm --filter @ai-novel/client test
corepack pnpm --filter @ai-novel/client typecheck
git diff --check
```

Expected: all commands pass.

- [ ] **Step 4: Commit final docs and release notes**

```powershell
git add docs/wiki/product/beginner-first-novel-completion.md docs/releases/release-notes.md README.md
git commit -m "docs: document long novel mainline workflow"
```

- [ ] **Step 5: Push feature branch to Gonghan project**

After all task commits pass verification:

```powershell
git status --short --branch
git push origin HEAD:style/gonghan-frontend-refresh
```

Expected: branch pushes to `Gonghan-Princess/AI-Novel-Writing-Assistant.git` through the current `origin` remote.

---

## Self-Review

Spec coverage:

- Type templates are covered by Task 1 and Task 5.
- Checkpoint explanation is covered by Task 2, Task 6, and Task 7.
- Home, create, single-book, follow-up, and chapter pages are covered by Tasks 4-7.
- Original API compatibility is preserved because the plan starts with shared config and client explanation helpers, and only allows a backend aggregation endpoint if the current data proves insufficient.
- Testing and wiki/release boundaries are covered by Task 8.

Completion-marker scan:

- The plan does not contain unfinished implementation markers or deferred behavior markers.
- Every task names exact files, commands, expected results, and commit scope.

Type consistency:

- `LongNovelTemplateId`, `LongNovelTemplate`, `LONG_NOVEL_TEMPLATES`, and `getLongNovelTemplate` are defined in Task 1 and reused in Task 5.
- `WorkflowExplanation` and `getWorkflowExplanation` are defined in Task 2 and reused in Tasks 3, 6, and 7.
