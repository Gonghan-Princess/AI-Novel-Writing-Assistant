import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { APP_RUNTIME } from "@/lib/constants";
import {
  getDesktopReadinessSnapshot,
  type DesktopReadinessItem,
  type DesktopReadinessSnapshot,
  type DesktopReadinessStatus,
} from "@/lib/desktop";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

function formatStatusLabel(status: DesktopReadinessStatus): string {
  switch (status) {
    case "ok":
      return "可用";
    case "warn":
      return "需确认";
    case "error":
      return "阻塞";
    default:
      return status;
  }
}

function getStatusIcon(status: DesktopReadinessStatus) {
  if (status === "ok") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />;
  }
  if (status === "error") {
    return <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />;
  }
  return <Clock3 className="h-4 w-4 text-amber-600" aria-hidden="true" />;
}

function getBadgeVariant(status: DesktopReadinessStatus): "default" | "destructive" | "outline" {
  if (status === "error") {
    return "destructive";
  }
  if (status === "ok") {
    return "default";
  }
  return "outline";
}

function ReadinessRow({ item }: { item: DesktopReadinessItem }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-md border bg-background p-3">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
        {getStatusIcon(item.status)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-medium">{item.label}</div>
          <Badge variant={getBadgeVariant(item.status)}>{formatStatusLabel(item.status)}</Badge>
        </div>
        <div className={`mt-1 text-sm text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
          {item.detail}
        </div>
        {item.path ? (
          <div className="mt-2 break-all rounded border bg-muted/40 px-2 py-1 font-mono text-xs text-muted-foreground">
            {item.path}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function DesktopStartupReadinessCard() {
  const [snapshot, setSnapshot] = useState<DesktopReadinessSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadSnapshot = async () => {
    if (APP_RUNTIME !== "desktop") {
      return;
    }
    setIsLoading(true);
    try {
      setSnapshot(await getDesktopReadinessSnapshot());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "桌面首启检查失败。");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSnapshot();
  }, []);

  if (APP_RUNTIME !== "desktop") {
    return null;
  }

  return (
    <Card className="min-w-0 overflow-hidden border-emerald-200 bg-emerald-50/70">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>桌面首启检查</CardTitle>
              {snapshot ? <Badge variant={getBadgeVariant(snapshot.status)}>{formatStatusLabel(snapshot.status)}</Badge> : null}
            </div>
            <CardDescription className={AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}>
              本地服务、数据库、日志、模型配置和备份目录。
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadSnapshot()} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            {isLoading ? "Checking" : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {snapshot?.items.map((item) => (
          <ReadinessRow key={item.id} item={item} />
        )) ?? (
          <div className="rounded-md border bg-background p-3 text-sm text-muted-foreground">
            {isLoading ? "正在检查桌面运行环境..." : "暂无桌面检查结果。"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
