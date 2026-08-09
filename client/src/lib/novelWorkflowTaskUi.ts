import type { NovelAutoDirectorTaskSummary } from "@ai-novel/shared/types/novel";
import type { NovelWorkflowCheckpoint } from "@ai-novel/shared/types/novelWorkflow";
import type { TaskStatus } from "@ai-novel/shared/types/task";

export type WorkflowBadgeVariant = "default" | "outline" | "secondary" | "destructive";
export type WorkflowRiskLevel = "none" | "low" | "medium" | "high";

export type WorkflowExplanation = {
  stage: string;
  summary: string | null;
  pauseReason: string | null;
  recommendedAction: string;
  route: string | null;
  riskLevel: WorkflowRiskLevel;
  canAutoContinue: boolean;
};

type WorkflowTaskLike = {
  id: string;
  status: TaskStatus;
  checkpointType?: NovelWorkflowCheckpoint | null;
  executionScopeLabel?: string | null;
  pendingManualRecovery?: boolean | null;
};

export const LIVE_TASK_STATUSES = new Set<TaskStatus>(["queued", "running", "waiting_approval"]);
export const BACKGROUND_RUNNING_TASK_STATUSES = new Set<TaskStatus>(["running"]);

function getExecutionScopeLabel(scopeLabel?: string | null, fallback = "第 1-10 章"): string {
  return scopeLabel?.trim() || fallback;
}

function buildAutoExecutionRunningLabel(scopeLabel?: string | null): string {
  return `${getExecutionScopeLabel(scopeLabel)}自动执行中`;
}

function buildAutoExecutionPausedLabel(scopeLabel?: string | null): string {
  return `${getExecutionScopeLabel(scopeLabel)}自动执行已暂停`;
}

function buildAutoExecutionCancelledLabel(scopeLabel?: string | null): string {
  return `${getExecutionScopeLabel(scopeLabel)}自动执行已取消`;
}

export function formatWorkflowCheckpoint(checkpoint?: NovelWorkflowCheckpoint | null, scopeLabel?: string | null): string {
  if (checkpoint === "candidate_selection_required") {
    return "等待确认书级方向";
  }
  if (checkpoint === "book_contract_ready") {
    return "Book Contract 已就绪";
  }
  if (checkpoint === "character_setup_required") {
    return "角色准备待审核";
  }
  if (checkpoint === "volume_strategy_ready") {
    return "卷战略待审核";
  }
  if (checkpoint === "chapter_batch_ready") {
    return buildAutoExecutionPausedLabel(scopeLabel);
  }
  if (checkpoint === "replan_required") {
    return "等待重规划";
  }
  if (checkpoint === "workflow_completed") {
    return "自动导演已完成";
  }
  return "自动导演";
}

export function getWorkflowBadge(task?: NovelAutoDirectorTaskSummary | null): {
  label: string;
  variant: WorkflowBadgeVariant;
} | null {
  if (!task) {
    return null;
  }
  const displayStatus = task.displayStatus?.trim() || null;
  if (
    (task.status === "queued" || task.status === "running")
    && task.checkpointType === "chapter_batch_ready"
  ) {
    return {
      label: displayStatus ?? buildAutoExecutionRunningLabel(task.executionScopeLabel),
      variant: "default",
    };
  }
  if ((task.status === "failed" || task.status === "cancelled") && task.checkpointType === "chapter_batch_ready") {
    return {
      label: displayStatus ?? (task.status === "failed"
        ? buildAutoExecutionPausedLabel(task.executionScopeLabel)
        : buildAutoExecutionCancelledLabel(task.executionScopeLabel)),
      variant: task.status === "failed" ? "destructive" : "outline",
    };
  }
  if (task.status === "waiting_approval") {
    return {
      label: displayStatus ?? formatWorkflowCheckpoint(task.checkpointType, task.executionScopeLabel),
      variant: "secondary",
    };
  }
  if (task.status === "running") {
    return {
      label: displayStatus ?? "自动导演进行中",
      variant: "default",
    };
  }
  if (task.status === "queued") {
    return {
      label: displayStatus ?? "自动导演排队中",
      variant: "secondary",
    };
  }
  if (task.status === "failed") {
    return {
      label: displayStatus ?? "自动导演失败",
      variant: "destructive",
    };
  }
  if (task.status === "cancelled") {
    return {
      label: displayStatus ?? "自动导演已取消",
      variant: "outline",
    };
  }
  return {
    label: displayStatus ?? (task.checkpointType === "workflow_completed"
      ? "自动导演已完成"
      : formatWorkflowCheckpoint(task.checkpointType, task.executionScopeLabel)),
    variant: "outline",
  };
}

export function getWorkflowDescription(task?: NovelAutoDirectorTaskSummary | null): string | null {
  if (!task) {
    return null;
  }
  if (
    (task.status === "queued" || task.status === "running")
    && task.checkpointType === "chapter_batch_ready"
  ) {
    return `AI 正在后台继续执行${getExecutionScopeLabel(task.executionScopeLabel)}，当前进度 ${Math.round(task.progress * 100)}%。`;
  }
  if ((task.status === "failed" || task.status === "cancelled") && task.checkpointType === "chapter_batch_ready") {
    return `${getExecutionScopeLabel(task.executionScopeLabel)}自动执行在批量阶段暂停了，建议先查看任务，再决定是否继续自动执行。`;
  }
  if (task.blockingReason?.trim()) {
    return task.blockingReason.trim();
  }
  if (task.checkpointSummary?.trim()) {
    return task.checkpointSummary.trim();
  }
  if (task.currentItemLabel?.trim()) {
    return task.currentItemLabel.trim();
  }
  if (task.resumeAction?.trim()) {
    return `推荐继续：${task.resumeAction.trim()}`;
  }
  if (task.nextActionLabel?.trim()) {
    return `下一步：${task.nextActionLabel.trim()}`;
  }
  return null;
}

function getTrimmedTaskText(text?: string | null): string | null {
  return text?.trim() || null;
}

function getWorkflowRecommendedAction(task: NovelAutoDirectorTaskSummary): string {
  if (task.checkpointType === "candidate_selection_required") {
    return "选择一套书级方向";
  }
  if (task.checkpointType === "chapter_batch_ready") {
    if (canContinueChapterBatchAutoExecution(task)) {
      return "继续自动执行章节批量";
    }
    if (task.status === "queued" || task.status === "running") {
      return "等待章节批量自动执行完成";
    }
    return "查看章节批量任务";
  }
  if (task.checkpointType === "replan_required") {
    return "查看重规划原因并重新规划";
  }
  if (task.checkpointType === "workflow_completed" || task.status === "succeeded") {
    return "查看自动导演成果";
  }
  if (task.status === "failed") {
    return "查看失败原因并处理";
  }
  if (task.status === "cancelled") {
    return "查看已取消任务";
  }
  if (canContinueDirector(task)) {
    return getTrimmedTaskText(task.resumeAction)
      ?? getTrimmedTaskText(task.nextActionLabel)
      ?? "继续自动导演";
  }
  if (task.status === "queued") {
    return "等待自动导演开始";
  }
  if (task.status === "running") {
    return "等待当前步骤完成";
  }
  return getTrimmedTaskText(task.nextActionLabel)
    ?? getTrimmedTaskText(task.resumeAction)
    ?? "查看自动导演任务";
}

function getWorkflowRoute(task: NovelAutoDirectorTaskSummary): string {
  if (task.checkpointType === "candidate_selection_required") {
    return getCandidateSelectionLink(task.id);
  }
  return getTaskCenterLink(task.id);
}

function getWorkflowRiskLevel(task: NovelAutoDirectorTaskSummary): WorkflowRiskLevel {
  if (task.pendingManualRecovery || task.checkpointType === "replan_required" || task.status === "failed") {
    return "high";
  }
  if (task.status === "cancelled") {
    return "medium";
  }
  if (task.status === "waiting_approval") {
    return task.checkpointType === "workflow_completed" ? "none" : "medium";
  }
  if (task.status === "queued" || task.status === "running") {
    return "low";
  }
  return "none";
}

export function getWorkflowExplanation(task?: NovelAutoDirectorTaskSummary | null): WorkflowExplanation {
  if (!task) {
    return {
      stage: "暂无自动导演任务",
      summary: null,
      pauseReason: null,
      recommendedAction: "创建或选择自动导演任务",
      route: null,
      riskLevel: "none",
      canAutoContinue: false,
    };
  }

  const checkpointStage = formatWorkflowCheckpoint(task.checkpointType, task.executionScopeLabel);
  const stage = getTrimmedTaskText(task.currentStage)
    ?? getTrimmedTaskText(task.displayStatus)
    ?? checkpointStage;
  const pauseReason = getTrimmedTaskText(task.blockingReason)
    ?? (task.pendingManualRecovery ? "任务需要人工恢复后才能继续。" : null);

  return {
    stage,
    summary: getWorkflowDescription(task),
    pauseReason,
    recommendedAction: getWorkflowRecommendedAction(task),
    route: getWorkflowRoute(task),
    riskLevel: getWorkflowRiskLevel(task),
    canAutoContinue: canContinueDirector(task) || canContinueChapterBatchAutoExecution(task),
  };
}

export function canContinueDirector(task?: NovelAutoDirectorTaskSummary | null): boolean {
  return Boolean(
    task
      && task.status === "waiting_approval"
      && task.checkpointType !== "candidate_selection_required"
      && task.checkpointType !== "chapter_batch_ready",
  );
}

export function canCancelDirectorTask(
  task?: Pick<WorkflowTaskLike, "status" | "pendingManualRecovery"> | null,
): boolean {
  if (!task) {
    return false;
  }
  if (task.pendingManualRecovery) {
    return true;
  }
  return task.status === "queued"
    || task.status === "running"
    || task.status === "waiting_approval"
    || task.status === "failed";
}

export function requiresCandidateSelection(task?: Pick<WorkflowTaskLike, "status" | "checkpointType"> | null): boolean {
  return Boolean(task && task.status === "waiting_approval" && task.checkpointType === "candidate_selection_required");
}

export function canContinueChapterBatchAutoExecution(task?: NovelAutoDirectorTaskSummary | null): boolean {
  if (!task) {
    return false;
  }
  return (task.status === "failed" || task.status === "cancelled") && task.checkpointType === "chapter_batch_ready";
}

export function canEnterChapterExecution(task?: NovelAutoDirectorTaskSummary | null): boolean {
  return Boolean(
    task
      && (task.checkpointType === "chapter_batch_ready"
        || task.checkpointType === "workflow_completed"),
  );
}

export function isLiveWorkflowTask(task?: NovelAutoDirectorTaskSummary | null): boolean {
  return Boolean(task && LIVE_TASK_STATUSES.has(task.status));
}

export function isWorkflowRunningInBackground(task?: NovelAutoDirectorTaskSummary | null): boolean {
  return Boolean(task && BACKGROUND_RUNNING_TASK_STATUSES.has(task.status));
}

export function isWorkflowActionRequired(task?: NovelAutoDirectorTaskSummary | null): boolean {
  return Boolean(
    task
      && (task.status === "waiting_approval"
        || task.status === "failed"
        || task.status === "cancelled"),
  );
}

export function getTaskCenterLink(taskId: string): string {
  return `/tasks?kind=novel_workflow&id=${taskId}`;
}

export function getCandidateSelectionLink(taskId: string): string {
  const searchParams = new URLSearchParams();
  searchParams.set("workflowTaskId", taskId);
  searchParams.set("mode", "director");
  return `/novels/create?${searchParams.toString()}`;
}
