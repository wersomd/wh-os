import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TasksView } from "@/features/tasks/components/tasks-view";
import { getTasks, getProjectsForPicker } from "@/features/tasks/queries";
import { getProject } from "@/features/projects/queries";
import { computeProjectProgress } from "@/features/projects/progress";
import { ProjectDetailHeader } from "@/features/projects/components/project-detail-header";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);
  return { title: project ? project.name : "Проект" };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [tasks, projects] = await Promise.all([
    getTasks(id),
    getProjectsForPicker(),
  ]);

  return (
    <>
      <Link
        href="/projects"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Все проекты
      </Link>

      <ProjectDetailHeader
        project={project}
        taskCount={tasks.length}
        progress={computeProjectProgress(tasks)}
      />

      <TasksView initialTasks={tasks} projects={projects} lockedProjectId={id} />
    </>
  );
}
