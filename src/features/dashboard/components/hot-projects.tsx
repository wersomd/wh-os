import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { describeDeadline } from "@/features/projects/progress";
import {
  DEADLINE_TONE_CLASS,
  DEFAULT_PROJECT_COLOR,
  PROJECT_STATUS_BADGE_CLASS,
  PROJECT_STATUS_LABELS,
} from "@/features/projects/constants";
import type { ProjectWithProgress } from "@/features/projects/queries";

export function HotProjects({ projects }: { projects: ProjectWithProgress[] }) {
  if (projects.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Нет активных проектов.</p>;
  }
  const now = new Date();
  return (
    <ul className="space-y-3 pt-1">
      {projects.map((project) => {
        const deadlineInfo = describeDeadline(now, project.deadline);
        return (
          <li key={project.id}>
            <Link
              href={`/projects/${project.id}`}
              className="block rounded-lg p-1.5 -m-1.5 transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: project.color ?? DEFAULT_PROJECT_COLOR }}
                />
                <span className="flex-1 truncate text-sm">{project.name}</span>
                <Badge
                  variant="secondary"
                  className={cn("shrink-0", PROJECT_STATUS_BADGE_CLASS[project.status])}
                >
                  {PROJECT_STATUS_LABELS[project.status]}
                </Badge>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${project.progress.percent ?? 0}%` }}
                  />
                </div>
                <span className={cn("shrink-0 text-xs tabular-nums", DEADLINE_TONE_CLASS[deadlineInfo.tone])}>
                  {deadlineInfo.label}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
