import type { NovelAutoDirectorTaskSummary } from "@ai-novel/shared/types/novel";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getWorkflowExplanation,
  type WorkflowRiskLevel,
} from "@/lib/novelWorkflowTaskUi";
import { cn } from "@/lib/utils";

interface LongNovelMainlineStatusPanelProps {
  novelTitle: string;
  task?: NovelAutoDirectorTaskSummary | null;
  currentPageLabel: string;
  onOpenRoute: (route: string) => void;
}

const RISK_LABELS: Record<WorkflowRiskLevel, string> = {
  none: "顺畅",
  low: "进行中",
  medium: "需确认",
  high: "需处理",
};

const RISK_CLASSES: Record<WorkflowRiskLevel, string> = {
  none: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  low: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-800",
  high: "border-destructive/40 bg-destructive/10 text-destructive",
};

export default function LongNovelMainlineStatusPanel({
  novelTitle,
  task,
  currentPageLabel,
  onOpenRoute,
}: LongNovelMainlineStatusPanelProps) {
  const explanation = getWorkflowExplanation(task);
  const canOpenRoute = Boolean(explanation.route);

  return (
    <section className="long-novel-mainline-status rounded-lg border bg-background/80 p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-foreground">{novelTitle || "未命名小说"}</div>
            <Badge variant="outline" className={cn("shrink-0", RISK_CLASSES[explanation.riskLevel])}>
              {RISK_LABELS[explanation.riskLevel]}
            </Badge>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{currentPageLabel}</div>
          <div className="mt-3 text-sm font-medium text-foreground">{explanation.stage}</div>
          {explanation.summary ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{explanation.summary}</p>
          ) : null}
          {explanation.pauseReason ? (
            <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-900">
              {explanation.pauseReason}
            </div>
          ) : null}
        </div>

        <Button
          type="button"
          size="sm"
          variant={canOpenRoute ? "default" : "outline"}
          disabled={!canOpenRoute}
          onClick={() => {
            if (explanation.route) {
              onOpenRoute(explanation.route);
            }
          }}
        >
          {explanation.recommendedAction}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
