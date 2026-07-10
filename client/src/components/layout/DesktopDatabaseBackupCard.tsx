import { useEffect, useState } from "react";
import { DatabaseBackup, FolderOpen, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { APP_RUNTIME } from "@/lib/constants";
import {
  createDesktopDatabaseBackup,
  getDesktopDatabaseBackupSnapshot,
  openDesktopDatabaseBackupDirectory,
  type DesktopDatabaseBackupEntry,
  type DesktopDatabaseBackupSnapshot,
} from "@/lib/desktop";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || "-";
  }
  return date.toLocaleString();
}

function BackupRow({ backup }: { backup: DesktopDatabaseBackupEntry }) {
  return (
    <div className="min-w-0 rounded-md border bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 font-medium">{backup.name}</div>
        <Badge variant="outline">{formatBytes(backup.sizeBytes)}</Badge>
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{formatDate(backup.createdAt)}</div>
      <div className="mt-2 break-all rounded border bg-muted/40 px-2 py-1 font-mono text-xs text-muted-foreground">
        {backup.directory}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        文件：{backup.files.length > 0 ? backup.files.join(", ") : "-"}
      </div>
    </div>
  );
}

export default function DesktopDatabaseBackupCard() {
  const [snapshot, setSnapshot] = useState<DesktopDatabaseBackupSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const loadSnapshot = async () => {
    if (APP_RUNTIME !== "desktop") {
      return;
    }
    setIsLoading(true);
    try {
      setSnapshot(await getDesktopDatabaseBackupSnapshot());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "读取桌面备份失败。");
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

  const createBackup = async () => {
    setIsCreating(true);
    try {
      const result = await createDesktopDatabaseBackup();
      if (result?.snapshot) {
        setSnapshot(result.snapshot);
      }
      toast("数据库备份已创建。");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "数据库备份失败。");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="min-w-0 overflow-hidden border-cyan-200 bg-cyan-50/70">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>桌面数据库备份</CardTitle>
              <Badge variant="outline">仅列出备份</Badge>
            </div>
            <CardDescription className={AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}>
              当前数据库、备份目录和最近五个手动备份。
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void loadSnapshot()} disabled={isLoading || isCreating}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              刷新
            </Button>
            <Button variant="outline" size="sm" onClick={() => void openDesktopDatabaseBackupDirectory()}>
              <FolderOpen className="mr-2 h-4 w-4" aria-hidden="true" />
              打开目录
            </Button>
            <Button size="sm" onClick={() => void createBackup()} disabled={isCreating || isLoading}>
              <DatabaseBackup className="mr-2 h-4 w-4" aria-hidden="true" />
              {isCreating ? "创建中" : "创建备份"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="min-w-0 rounded-md border bg-background p-3">
            <div className="text-xs text-muted-foreground">当前数据库</div>
            <div className="mt-2 break-all font-mono text-xs">{snapshot?.currentDatabasePath ?? "-"}</div>
          </div>
          <div className="min-w-0 rounded-md border bg-background p-3">
            <div className="text-xs text-muted-foreground">备份目录</div>
            <div className="mt-2 break-all font-mono text-xs">{snapshot?.backupDirectory ?? "-"}</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">最近备份</div>
          {snapshot?.recentBackups.length ? (
            snapshot.recentBackups.map((backup) => <BackupRow key={backup.directory} backup={backup} />)
          ) : (
            <div className="rounded-md border bg-background p-3 text-sm text-muted-foreground">
              {isLoading ? "正在读取备份..." : "还没有手动数据库备份。"}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
