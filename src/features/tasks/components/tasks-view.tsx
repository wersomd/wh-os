"use client";

import { Suspense, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { TaskStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Board, type Columns } from "./board";
import { TaskList } from "./task-list";
import { TaskDialog } from "./task-dialog";
import { ViewSwitcher } from "./view-switcher";
import { TaskFilters } from "./task-filters";
import { createTask, moveTask, toggleDone } from "../actions";
import { TASK_STATUS_ORDER } from "../constants";
import { useTaskView } from "../use-task-view";
import { applyTaskView, matchesFilters, sortTasks } from "../view";
import type { ProjectOption, TaskWithProject } from "../queries";

function groupByStatus(tasks: TaskWithProject[]): Columns {
  const columns = {} as Columns;
  for (const status of TASK_STATUS_ORDER) {
    columns[status] = tasks.filter((t) => t.status === status);
  }
  return columns;
}

type TasksViewProps = {
  initialTasks: TaskWithProject[];
  projects: ProjectOption[];
  lockedProjectId?: string;
};

// useTaskView() reads the URL query string, so the tree needs a Suspense
// boundary (Next 15 requirement for useSearchParams).
export function TasksView(props: TasksViewProps) {
  return (
    <Suspense fallback={<div className="h-9" />}>
      <TasksViewInner {...props} />
    </Suspense>
  );
}

function TasksViewInner({
  initialTasks,
  projects,
  lockedProjectId,
}: TasksViewProps) {
  const router = useRouter();
  const [, start] = useTransition();
  const { view, filters, sort, isFiltered, setView, setFilters, setSort, reset } =
    useTaskView();

  // Raw per-status order, kept in sync with the server. Drag mutations write
  // here; the board/list derive their filtered + sorted views from it.
  const [columns, setColumns] = useState<Columns>(() =>
    groupByStatus(initialTasks),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaskWithProject | null>(null);

  useEffect(() => {
    setColumns(groupByStatus(initialTasks));
  }, [initialTasks]);

  // Dragging only makes sense in the stored order with every card visible:
  // once a sort or a filter is on, a reordered subset can't be persisted
  // faithfully, so drag is locked until the user clears both.
  const dndDisabled = sort !== "manual" || isFiltered;

  const boardColumns = useMemo(() => {
    const now = new Date();
    const out = {} as Columns;
    for (const s of TASK_STATUS_ORDER) {
      out[s] = sortTasks(
        columns[s].filter((t) => matchesFilters(t, filters, now)),
        sort,
      );
    }
    return out;
  }, [columns, filters, sort]);

  const listTasks = useMemo(
    () =>
      applyTaskView(
        TASK_STATUS_ORDER.flatMap((s) => columns[s]),
        filters,
        sort,
      ),
    [columns, filters, sort],
  );

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function addTask(title: string, status: TaskStatus) {
    start(async () => {
      const res = await createTask({
        title,
        status,
        projectId: lockedProjectId ?? "",
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  function persistMove(
    taskId: string,
    toStatus: TaskStatus,
    orderedIds: string[],
  ) {
    start(async () => {
      const res = await moveTask({ taskId, toStatus, orderedIds });
      if ("error" in res) {
        toast.error(res.error);
        router.refresh(); // revert to server truth
      }
    });
  }

  function onToggle(id: string, done: boolean) {
    const target = done ? TaskStatus.DONE : TaskStatus.TODO;
    setColumns((prev) => moveToStatus(prev, id, target));
    start(async () => {
      const res = await toggleDone(id, done);
      if ("error" in res) {
        toast.error(res.error);
        router.refresh();
      }
    });
  }

  function onCardClick(task: TaskWithProject) {
    setEditing(task);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewSwitcher view={view} onChange={setView} />
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Задача
        </Button>
      </div>

      <TaskFilters
        filters={filters}
        onChange={setFilters}
        sort={sort}
        onSortChange={setSort}
        onReset={reset}
        isFiltered={isFiltered}
        projects={projects}
        showProject={!lockedProjectId}
      />

      {view === "board" ? (
        <Board
          columns={boardColumns}
          dndDisabled={dndDisabled}
          onColumnsChange={setColumns}
          onMoveEnd={persistMove}
          onAddTask={addTask}
          onCardClick={onCardClick}
        />
      ) : (
        <TaskList
          tasks={listTasks}
          onToggle={onToggle}
          onCardClick={onCardClick}
        />
      )}

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editing}
        projects={projects}
        lockedProjectId={lockedProjectId}
      />
    </div>
  );
}

// Move a task to another status column (append to the end), updating its status.
function moveToStatus(
  columns: Columns,
  id: string,
  status: TaskStatus,
): Columns {
  let moved: TaskWithProject | undefined;
  const next = {} as Columns;
  for (const s of TASK_STATUS_ORDER) {
    next[s] = columns[s].filter((t) => {
      if (t.id === id) {
        moved = t;
        return false;
      }
      return true;
    });
  }
  if (moved) next[status] = [...next[status], { ...moved, status }];
  return next;
}
