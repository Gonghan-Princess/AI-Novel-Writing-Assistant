import type {
  LongNovelTemplate,
  LongNovelTemplateId,
} from "@ai-novel/shared/types/longNovelTemplate";
import { LONG_NOVEL_TEMPLATES } from "@ai-novel/shared/types/longNovelTemplate";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TemplateDisplay = LongNovelTemplate & {
  name?: string;
  shortLabel?: string;
};

interface LongNovelTemplatePickerProps {
  value: LongNovelTemplateId;
  onChange: (id: LongNovelTemplateId) => void;
}

function getTemplateName(template: TemplateDisplay): string {
  return template.name?.trim() || template.label;
}

function getTemplateShortLabel(template: TemplateDisplay): string {
  return template.shortLabel?.trim() || template.label;
}

export default function LongNovelTemplatePicker({ value, onChange }: LongNovelTemplatePickerProps) {
  return (
    <div className="long-novel-template-picker grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {LONG_NOVEL_TEMPLATES.map((template) => {
        const displayTemplate = template as TemplateDisplay;
        const selected = template.id === value;

        return (
          <button
            key={template.id}
            type="button"
            aria-pressed={selected}
            className={cn(
              "min-w-0 rounded-lg border bg-background p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20"
                : "border-border hover:border-primary/40 hover:bg-muted/30",
            )}
            onClick={() => onChange(template.id)}
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">
                  {getTemplateName(displayTemplate)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {getTemplateShortLabel(displayTemplate)}
                </div>
              </div>
              {selected ? (
                <Badge className="shrink-0" variant="default">
                  已选择
                </Badge>
              ) : null}
            </div>
            <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted-foreground">
              {template.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {template.planningFocus.slice(0, 3).map((focus) => (
                <Badge key={focus} variant="outline" className="max-w-full truncate text-[11px] font-normal">
                  {focus}
                </Badge>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
