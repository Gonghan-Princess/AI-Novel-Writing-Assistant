import type { LongNovelTemplate } from "@ai-novel/shared/types/longNovelTemplate";
import { Badge } from "@/components/ui/badge";

type TemplateWithOpeningQuestions = LongNovelTemplate & {
  openingQuestions?: readonly string[];
};

interface LongNovelMainlinePreviewProps {
  template: LongNovelTemplate;
  inspiration: string;
  automationLabel: string;
}

function firstItems(items: readonly string[] | undefined, fallback: readonly string[], count = 2): string[] {
  const source = items?.length ? items : fallback;
  return source.slice(0, count);
}

export default function LongNovelMainlinePreview({
  template,
  inspiration,
  automationLabel,
}: LongNovelMainlinePreviewProps) {
  const displayTemplate = template as TemplateWithOpeningQuestions;
  const trimmedInspiration = inspiration.trim();
  const steps = [
    {
      title: "类型定位",
      badge: template.label,
      prompts: firstItems(displayTemplate.openingQuestions, template.planningFocus),
    },
    {
      title: "书级契约",
      badge: "开书承诺",
      prompts: firstItems(template.planningFocus, [template.description], 3),
    },
    {
      title: "世界角色",
      badge: "设定底座",
      prompts: [
        ...firstItems(template.worldbuildingPrompts, template.planningFocus, 1),
        ...firstItems(template.characterPrompts, template.planningFocus, 1),
      ],
    },
    {
      title: "卷与章纲",
      badge: "长线结构",
      prompts: firstItems(template.automationAdvice, template.planningFocus),
    },
    {
      title: "正文生产",
      badge: automationLabel,
      prompts: firstItems(template.characterPrompts, template.planningFocus),
    },
    {
      title: "审稿回灌",
      badge: "连续性",
      prompts: firstItems(template.reviewFocus, template.planningFocus, 3),
    },
  ];

  return (
    <section className="long-novel-mainline-preview rounded-lg border bg-background/80 p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">长篇主线预览</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {trimmedInspiration || "先用模板建立主线，再在每个检查点补充你的具体想法。"}
          </p>
        </div>
        <Badge variant="secondary" className="w-fit shrink-0">
          {automationLabel}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step.title} className="rounded-lg border bg-muted/15 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <div className="text-sm font-medium text-foreground">{step.title}</div>
              </div>
              <Badge variant="outline" className="max-w-[9rem] truncate text-[11px] font-normal">
                {step.badge}
              </Badge>
            </div>
            <ul className="mt-3 space-y-2">
              {step.prompts.map((prompt) => (
                <li key={prompt} className="text-xs leading-5 text-muted-foreground">
                  {prompt}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
