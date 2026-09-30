import { z } from "zod";

export const kinds = [
  "task",
  "activity",
  "event",
  "reminder",
  "subject",
  "content",
  "exam",
  "delivery",
  "session",
  "mock",
  "weekly",
  "material",
] as const;
export const labels: Record<(typeof kinds)[number], string> = {
  task: "Tarefa",
  activity: "Atividade",
  event: "Compromisso",
  reminder: "Lembrete",
  subject: "Matéria",
  content: "Conteúdo",
  exam: "Prova",
  delivery: "Entrega",
  session: "Sessão de estudo",
  mock: "Simulado",
  weekly: "Programação semanal",
  material: "Material",
};
export const statuses = [
  "pending",
  "in_progress",
  "completed",
  "postponed",
  "cancelled",
] as const;
export const statusLabels = {
  pending: "Pendente",
  in_progress: "Em andamento",
  completed: "Concluída",
  postponed: "Adiada",
  cancelled: "Cancelada",
};
export const priorityLabels = { low: "Baixa", medium: "Média", high: "Alta" };
const iso = z.string().datetime({ offset: true });
export const entryInput = z
  .object({
    kind: z.enum(kinds),
    title: z.string().trim().min(1, "Informe o título").max(200),
    notes: z.string().max(5000).default(""),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
    status: z.enum(statuses).default("pending"),
    startsAt: iso.nullable().default(null),
    endsAt: iso.nullable().default(null),
    subjectId: z.string().uuid().nullable().default(null),
    durationMinutes: z.number().int().min(0).max(1440).default(0),
    score: z.number().min(0).max(100).nullable().default(null),
    weekday: z.number().int().min(0).max(6).nullable().default(null),
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .nullable()
      .default(null),
    color: z.enum(["sage", "blue", "amber", "rose", "violet"]).default("sage"),
  })
  .superRefine((v, ctx) => {
    if (v.endsAt && (!v.startsAt || new Date(v.endsAt) <= new Date(v.startsAt)))
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "O término deve ser depois do início",
      });
    if (
      ["event", "exam", "delivery", "session", "mock"].includes(v.kind) &&
      !v.startsAt
    )
      ctx.addIssue({
        code: "custom",
        path: ["startsAt"],
        message: "Informe a data",
      });
    if (v.kind === "event" && !v.endsAt)
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Informe o término",
      });
    if (v.kind === "weekly" && (v.weekday === null || !v.time))
      ctx.addIssue({
        code: "custom",
        path: ["weekday"],
        message: "Informe o dia e horário",
      });
    if (
      v.kind === "session" &&
      v.status === "completed" &&
      v.durationMinutes < 1
    )
      ctx.addIssue({
        code: "custom",
        path: ["durationMinutes"],
        message: "Informe a duração",
      });
  });
export type EntryInput = z.infer<typeof entryInput>;
export type Entry = EntryInput & {
  id: string;
  updatedAt: string;
  createdAt: string;
  googleEventId: string | null;
  googleEtag: string | null;
  calendarId: string | null;
  syncedAt: string | null;
  driveFileId: string | null;
  driveUrl: string | null;
};
export const actionable = (e: Entry) =>
  !["subject", "material", "weekly"].includes(e.kind);
export const isOverdue = (e: Entry, now = new Date()) =>
  actionable(e) &&
  !!e.startsAt &&
  new Date(e.endsAt ?? e.startsAt) < now &&
  !["completed", "cancelled"].includes(e.status);
export const dayKey = (date: Date | string, timezone = "America/Sao_Paulo") =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
export function metrics(entries: Entry[], date = new Date()) {
  const day = dayKey(date);
  const tasks = entries.filter(actionable).filter((e) => e.kind !== "session");
  const today = tasks.filter((e) => e.startsAt && dayKey(e.startsAt) === day);
  const sessions = entries.filter(
    (e) => e.kind === "session" && e.status === "completed",
  );
  const completed = tasks.filter((e) => e.status === "completed").length;
  const todayCompleted = today.filter((e) => e.status === "completed").length;
  const start = new Date(date);
  start.setDate(start.getDate() - 6);
  const week = tasks.filter(
    (e) =>
      e.startsAt &&
      dayKey(e.startsAt) >= dayKey(start) &&
      dayKey(e.startsAt) <= day,
  );
  return {
    total: tasks.length,
    completed,
    todayTotal: today.length,
    todayCompleted,
    todayPercent: today.length
      ? Math.round((todayCompleted / today.length) * 100)
      : 0,
    weekPercent: week.length
      ? Math.round(
          (week.filter((e) => e.status === "completed").length / week.length) *
            100,
        )
      : 0,
    studyMinutes: sessions.reduce((sum, e) => sum + e.durationMinutes, 0),
    sessions: sessions.length,
    overdue: tasks.filter((e) => isOverdue(e, date)).length,
  };
}
