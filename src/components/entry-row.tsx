"use client";
import {
  ListTodo,
  Circle,
  CalendarDays,
  Clock3,
  BookOpen,
  FolderOpen,
  CheckCheck,
  MoreHorizontal,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  isOverdue,
  statusLabels,
  priorityLabels,
  type Entry,
} from "@/lib/domain";
const iconByKind = {
  task: ListTodo,
  activity: Circle,
  event: CalendarDays,
  reminder: Clock3,
  subject: BookOpen,
  content: BookOpen,
  exam: BookOpen,
  delivery: FolderOpen,
  session: Clock3,
  mock: CheckCheck,
  weekly: CalendarDays,
  material: FolderOpen,
};
export function EntryRow({
  item,
  subjects,
  edit,
  complete,
  disabled,
}: {
  item: Entry;
  subjects: Entry[];
  edit: () => void;
  complete: () => void;
  disabled: boolean;
}) {
  const Icon = iconByKind[item.kind];
  const subject = subjects.find((s) => s.id === item.subjectId);
  return (
    <div
      className={`entry-row ${item.status === "completed" ? "is-complete" : ""}`}
    >
      {!["material", "weekly", "subject"].includes(item.kind) ? (
        <button
          className={`check-button ${item.status === "completed" ? "checked" : ""}`}
          aria-label={`${item.status === "completed" ? "Reabrir" : "Concluir"} ${item.title}`}
          onClick={complete}
          disabled={disabled || item.kind === "session"}
        >
          {item.status === "completed" && <Check size={13} />}
        </button>
      ) : (
        <span className="entry-type-icon">
          <Icon size={18} />
        </span>
      )}
      <button className="entry-main" onClick={edit}>
        <strong>{item.title}</strong>
        <span>
          {subject && (
            <small className={`subject-label ${subject.color}`}>
              {subject.title}
            </small>
          )}
          {item.kind === "weekly"
            ? `${["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][item.weekday ?? 0]} · ${item.time}`
            : item.startsAt
              ? new Date(item.startsAt).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Sem data"}
          {item.durationMinutes > 0 && ` · ${item.durationMinutes} min`}
        </span>
      </button>
      <span
        className={`priority priority-${item.priority}`}
        title={`Prioridade ${priorityLabels[item.priority]}`}
      >
        <span />
        {priorityLabels[item.priority]}
      </span>
      <Badge
        variant="outline"
        className={isOverdue(item) ? "overdue-badge" : ""}
      >
        {isOverdue(item) ? "Atrasada" : statusLabels[item.status]}
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Editar ${item.title}`}
        onClick={edit}
      >
        <MoreHorizontal size={18} />
      </Button>
    </div>
  );
}
