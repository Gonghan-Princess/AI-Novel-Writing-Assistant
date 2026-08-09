import { useEffect, useState } from "react";
import type { UnifiedTaskDetail } from "@ai-novel/shared/types/task";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BOOK_ANALYSIS_SECTIONS } from "@ai-novel/shared/types/bookAnalysis";
import {
  getLongNovelTemplate,
  type LongNovelTemplateId,
} from "@ai-novel/shared/types/longNovelTemplate";
import { flattenGenreTreeOptions, getGenreTree } from "@/api/genre";
import { bootstrapNovelWorkflow } from "@/api/novelWorkflow";
import { createNovel } from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";
import { flattenStoryModeTreeOptions, getStoryModeTree } from "@/api/storyMode";
import { getWorldList } from "@/api/world";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import NovelAutoDirectorDialog from "./components/NovelAutoDirectorDialog";
import NovelBasicInfoForm from "./components/NovelBasicInfoForm";
import NovelCreateResourceRecommendationCard from "./components/NovelCreateResourceRecommendationCard";
import LongNovelMainlinePreview from "./components/LongNovelMainlinePreview";
import LongNovelTemplatePicker from "./components/LongNovelTemplatePicker";
import { BookFramingQuickFillButton } from "./components/basicInfoForm/BookFramingQuickFillButton";
import NovelCreateTitleQuickFill from "./components/titleWorkshop/NovelCreateTitleQuickFill";
import { useNovelContinuationSources } from "./hooks/useNovelContinuationSources";
import {
  buildLongNovelTemplatePatch,
  buildNovelCreatePayload,
  createDefaultNovelBasicFormState,
  patchNovelBasicForm,
} from "./novelBasicInfo.shared";

export default function NovelCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [basicForm, setBasicForm] = useState(() => createDefaultNovelBasicFormState());
  const [restoredWorkflowTask, setRestoredWorkflowTask] = useState<UnifiedTaskDetail | null>(null);
  const [directorWorkflowTaskId, setDirectorWorkflowTaskId] = useState("");

  const workflowTaskIdFromQuery = searchParams.get("workflowTaskId") ?? "";
  const workflowMode = searchParams.get("mode");
  const selectedLongNovelTemplateId = basicForm.longNovelTemplateId ?? "custom";
  const selectedTemplate = getLongNovelTemplate(selectedLongNovelTemplateId);
  const mainlineInspiration = [
    basicForm.description,
    basicForm.bookSellingPoint,
    basicForm.first30ChapterPromise,
    basicForm.title,
  ].find((value) => value.trim()) ?? "";
  const automationLabel = workflowMode === "director" || directorWorkflowTaskId
    ? "自动导演"
    : "AI 副驾";

  const worldListQuery = useQuery({
    queryKey: queryKeys.worlds.all,
    queryFn: getWorldList,
  });

  const genreTreeQuery = useQuery({
    queryKey: queryKeys.genres.all,
    queryFn: getGenreTree,
  });
  const genreOptions = flattenGenreTreeOptions(genreTreeQuery.data?.data ?? []);
  const storyModeTreeQuery = useQuery({
    queryKey: queryKeys.storyModes.all,
    queryFn: getStoryModeTree,
  });
  const storyModeOptions = flattenStoryModeTreeOptions(storyModeTreeQuery.data?.data ?? []);

  const {
    sourceBookAnalysesQuery,
    sourceNovelOptions,
    sourceKnowledgeOptions,
    sourceNovelBookAnalysisOptions,
  } = useNovelContinuationSources("", basicForm);

  useEffect(() => {
    if (
      basicForm.writingMode !== "continuation"
      || !basicForm.continuationBookAnalysisId
    ) {
      return;
    }
    if (sourceBookAnalysesQuery.isLoading || sourceBookAnalysesQuery.isFetching) {
      return;
    }
    const exists = sourceNovelBookAnalysisOptions.some((item) => item.id === basicForm.continuationBookAnalysisId);
    if (exists) {
      return;
    }
    setBasicForm((prev) => ({
      ...prev,
      continuationBookAnalysisId: "",
      continuationBookAnalysisSections: [],
    }));
  }, [
    basicForm.continuationBookAnalysisId,
    basicForm.writingMode,
    sourceBookAnalysesQuery.isFetching,
    sourceBookAnalysesQuery.isLoading,
    sourceNovelBookAnalysisOptions,
  ]);

  const restoreWorkflowMutation = useMutation({
    mutationFn: () => bootstrapNovelWorkflow({
      workflowTaskId: workflowTaskIdFromQuery || undefined,
      lane: workflowMode === "director" ? "auto_director" : "manual_create",
    }),
    onSuccess: (response) => {
      const task = response.data;
      setRestoredWorkflowTask(task ?? null);
      if (!task) {
        return;
      }
      const seedPayload = (task.meta.seedPayload ?? null) as { basicForm?: Partial<typeof basicForm> } | null;
      if (seedPayload?.basicForm) {
        setBasicForm((prev) => patchNovelBasicForm(prev, seedPayload.basicForm ?? {}));
      }
      if (workflowMode === "director") {
        setDirectorWorkflowTaskId(task.id);
      }
      if (task.id !== workflowTaskIdFromQuery) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set("workflowTaskId", task.id);
          if (workflowMode === "director") {
            next.set("mode", "director");
          }
          return next;
        }, { replace: true });
      }
    },
  });

  useEffect(() => {
    if (!workflowTaskIdFromQuery) {
      setRestoredWorkflowTask(null);
      if (workflowMode !== "director") {
        setDirectorWorkflowTaskId("");
      }
      return;
    }
    restoreWorkflowMutation.mutate();
  }, [workflowTaskIdFromQuery, workflowMode]);

  const createNovelMutation = useMutation({
    mutationFn: async () => {
      const task = await bootstrapNovelWorkflow({
        lane: "manual_create",
        title: basicForm.title,
        seedPayload: {
          basicForm,
        },
      });
      const created = await createNovel(buildNovelCreatePayload(basicForm));
      const novelId = created.data?.id;
      if (!novelId) {
        return {
          response: created,
          workflowTaskId: task.data?.id ?? "",
        };
      }
      const attached = await bootstrapNovelWorkflow({
        workflowTaskId: task.data?.id,
        novelId,
        lane: "manual_create",
        title: created.data?.title,
        seedPayload: {
          basicForm,
        },
      });
      return {
        response: created,
        workflowTaskId: attached.data?.id ?? task.data?.id ?? "",
      };
    },
    onSuccess: async ({ response, workflowTaskId }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.novels.all });
      if (response.data?.id) {
        const search = new URLSearchParams();
        search.set("stage", "basic");
        if (workflowTaskId) {
          search.set("workspaceTaskId", workflowTaskId);
        }
        navigate(`/novels/${response.data.id}/edit?${search.toString()}`);
      }
    },
  });

  const handleLongNovelTemplateChange = (longNovelTemplateId: LongNovelTemplateId) => {
    setBasicForm((prev) => {
      const patch = buildLongNovelTemplatePatch(prev, longNovelTemplateId);
      return patchNovelBasicForm(prev, patch);
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>创建小说项目</CardTitle>
          <CardDescription>
            先把这本书写给谁、靠什么吸引追读、前 30 章要兑现什么定义清楚。这里的设置会直接影响后续主线规划、世界边界、写法建议和 AI 生成行为，创建后仍可继续调整。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">选择长篇模板</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                先选一种主线骨架，我会把它变成可继续调整的简介、卖点和前期承诺。
              </p>
            </div>
            <LongNovelTemplatePicker
              value={selectedLongNovelTemplateId}
              onChange={handleLongNovelTemplateChange}
            />
          </section>
          <NovelBasicInfoForm
            basicForm={basicForm}
            genreOptions={genreOptions}
            storyModeOptions={storyModeOptions}
            worldOptions={worldListQuery.data?.data ?? []}
            sourceNovelOptions={sourceNovelOptions}
            sourceKnowledgeOptions={sourceKnowledgeOptions}
            sourceNovelBookAnalysisOptions={sourceNovelBookAnalysisOptions}
            isLoadingSourceNovelBookAnalyses={sourceBookAnalysesQuery.isLoading}
            availableBookAnalysisSections={[...BOOK_ANALYSIS_SECTIONS]}
            onFormChange={(patch) => setBasicForm((prev) => patchNovelBasicForm(prev, patch))}
            onSubmit={() => createNovelMutation.mutate()}
            isSubmitting={createNovelMutation.isPending}
            submitLabel="创建并进入项目"
            showPublicationStatus={false}
            framingQuickFill={(
              <BookFramingQuickFillButton
                basicForm={basicForm}
                genreOptions={genreOptions}
                onApplySuggestion={(patch) => setBasicForm((prev) => patchNovelBasicForm(prev, patch))}
              />
            )}
            resourceRecommendation={(
              <NovelCreateResourceRecommendationCard
                basicForm={basicForm}
                onApplySuggestion={(patch) => setBasicForm((prev) => patchNovelBasicForm(prev, patch))}
              />
            )}
            projectQuickStart={(
              <div className="space-y-3">
                <LongNovelMainlinePreview
                  template={selectedTemplate}
                  inspiration={mainlineInspiration}
                  automationLabel={automationLabel}
                />
                <NovelAutoDirectorDialog
                  basicForm={basicForm}
                  genreOptions={genreOptions}
                  worldOptions={worldListQuery.data?.data ?? []}
                  workflowTaskId={directorWorkflowTaskId}
                  restoredTask={restoredWorkflowTask}
                  initialOpen={workflowMode === "director"}
                  onBasicFormChange={(patch) => setBasicForm((prev) => patchNovelBasicForm(prev, patch))}
                  onWorkflowTaskChange={(taskId) => {
                    setDirectorWorkflowTaskId(taskId);
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("workflowTaskId", taskId);
                      next.set("mode", "director");
                      return next;
                    }, { replace: true });
                  }}
                  onConfirmed={({ novelId, workflowTaskId, resumeTarget }) => {
                    const search = new URLSearchParams();
                    search.set("stage", resumeTarget?.stage ?? "story_macro");
                    if (workflowTaskId) {
                      search.set("directorTaskId", workflowTaskId);
                    }
                    if (resumeTarget?.chapterId) {
                      search.set("chapterId", resumeTarget.chapterId);
                    }
                    if (resumeTarget?.volumeId) {
                      search.set("volumeId", resumeTarget.volumeId);
                    }
                    navigate(`/novels/${novelId}/edit?${search.toString()}`);
                  }}
                />
              </div>
            )}
            titleQuickFill={(
              <NovelCreateTitleQuickFill
                basicForm={basicForm}
                onApplyTitle={(title) => setBasicForm((prev) => patchNovelBasicForm(prev, { title }))}
              />
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
