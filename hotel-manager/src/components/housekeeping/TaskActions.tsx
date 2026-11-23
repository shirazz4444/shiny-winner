"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import TaskFormDialog from "@/components/housekeeping/TaskFormDialog";
import type {
  RoomOption,
  StaffOption,
  TaskItem,
} from "@/components/housekeeping/types";
import type { ApiResponse } from "@/lib/apiResponse";
import type { Role } from "@/types/employee";

type Props = {
  task: TaskItem;
  viewerRole: Role;
  viewerId: string;
  rooms: RoomOption[];
  housekeepers: StaffOption[];
};

export default function TaskActions({
  task,
  viewerRole,
  viewerId,
  rooms,
  housekeepers,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const manage = viewerRole === "ADMIN" || viewerRole === "MANAGER";
  const open = task.status !== "COMPLETED";
  const canWork =
    viewerRole === "HOUSEKEEPING"
      ? !task.assignedToId || task.assignedToId === viewerId
      : !!task.assignedToId;
  const canStart = open && task.status === "PENDING" && canWork;
  const canComplete = open && canWork;
  const canEdit = manage && open;

  if (!canStart && !canComplete && !canEdit) {
    return <span className="text-sm text-muted-foreground">–</span>;
  }

  async function run(key: string, path: string) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(
        `/api/housekeeping/tasks/${encodeURIComponent(task.id)}/${path}`,
        {
          method: "POST",
        },
      );
      const body: ApiResponse<unknown> = await res.json();
      if (!body.success) setError(body.error.message);
      else router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    }
    setBusy(null);
  }

  return (
    <div className="flex flex-col items-stretch gap-1">
      {canStart && (
        <Button
          size="xs"
          disabled={busy !== null}
          onClick={() => run("start", "start")}
        >
          {busy === "start" ? "Starting..." : "Start"}
        </Button>
      )}
      {canComplete && (
        <Button
          size="xs"
          disabled={busy !== null}
          onClick={() => run("complete", "complete")}
        >
          {busy === "complete" ? "Saving..." : "Mark cleaned"}
        </Button>
      )}
      {canEdit && (
        <TaskFormDialog
          mode="edit"
          task={task}
          rooms={rooms}
          housekeepers={housekeepers}
        />
      )}
      {error && (
        <p
          role="alert"
          className="max-w-48 whitespace-normal text-xs text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
