import { CheckCircle2, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChapterProductionContinuityCardProps {
  hasContent: boolean;
  taskSheetReady: boolean;
  reviewReady: boolean;
  repairReady: boolean;
  stateSynced: boolean;
}

const STATUS_ITEMS = [
  { key: "taskSheetReady", label: "任务单" },
  { key: "hasContent", label: "正文" },
  { key: "reviewReady", label: "审稿" },
  { key: "repairReady", label: "修复" },
  { key: "stateSynced", label: "回灌" },
] as const;

export default function ChapterProductionContinuityCard(props: ChapterProductionContinuityCardProps) {
  return (
    <section className="chapter-production-continuity-card rounded-lg border bg-background/80 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_ITEMS.map((item) => {
          const ready = props[item.key];

          return (
            <div
              key={item.key}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium",
                ready
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                  : "border-border bg-muted/20 text-muted-foreground",
              )}
            >
              {ready ? (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <CircleDashed className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
