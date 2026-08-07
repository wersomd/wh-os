"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderKanban, Plus } from "lucide-react";
import type { Project } from "@prisma/client";
import { ProjectStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { ProjectCard } from "./project-card";
import { ProjectDialog } from "./project-dialog";
import { deleteProject } from "../actions";
import { rankProjectUrgency } from "../progress";
import type { ProjectWithProgress } from "../queries";

const ACTIVE_STATUSES: ProjectStatus[] = [
  ProjectStatus.PLANNING,
  ProjectStatus.IN_PROGRESS,
  ProjectStatus.REVIEW,
  ProjectStatus.ON_HOLD,
];

type ProjectFilter = "active" | "all" | "done" | "archived";

const FILTER_OPTIONS: { value: ProjectFilter; label: string }[] = [
  { value: "active", label: "В работе" },
  { value: "all", label: "Все" },
  { value: "done", label: "Завершены" },
  { value: "archived", label: "Архив" },
];

function filterProjects(projects: ProjectWithProgress[], filter: ProjectFilter) {
  switch (filter) {
    case "active":
      return projects.filter((p) => ACTIVE_STATUSES.includes(p.status));
    case "done":
      return projects.filter((p) => p.status === ProjectStatus.DONE);
    case "archived":
      return projects.filter((p) => p.status === ProjectStatus.ARCHIVED);
    case "all":
      return projects;
  }
}

export function ProjectList({ projects }: { projects: ProjectWithProgress[] }) {
  const router = useRouter();
  const [, startDelete] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [filter, setFilter] = useState<ProjectFilter>("active");

  const visible = useMemo(
    () => rankProjectUrgency(new Date(), filterProjects(projects, filter)),
    [projects, filter],
  );

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(project: Project) {
    setEditing(project);
    setDialogOpen(true);
  }

  function remove(project: ProjectWithProgress) {
    const count = project.taskCount;
    const warning =
      count > 0
        ? `\n\n${count} задач(и) останутся, но потеряют привязку к проекту.`
        : "";
    if (!window.confirm(`Удалить проект «${project.name}»?${warning}`)) return;
    startDelete(async () => {
      const res = await deleteProject(project.id);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Проект удалён");
      router.refresh();
    });
  }

  return (
    <>
      <PageHeader
        title="Проекты"
        description="Сгруппируйте задачи по проектам и отслеживайте их прогресс."
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Новый проект
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filter === f.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={projects.length === 0 ? "Пока нет проектов" : "Нет проектов в этом фильтре"}
          description={
            projects.length === 0
              ? "Создайте первый проект, чтобы сгруппировать задачи."
              : "Попробуйте выбрать другой фильтр."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={() => openEdit(project)}
              onDelete={() => remove(project)}
            />
          ))}
        </div>
      )}

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editing}
      />
    </>
  );
}
