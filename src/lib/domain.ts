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
const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "Informe uma data válida");
export const entryInput = z
  .object({
    kind: z.enum(kinds),
    title: z.string().trim().min(1, "Informe o título").max(200),
    notes: z.string().max(5000).default(""),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
    status: z.enum(statuses).default("pending"),
    recurrence: z.enum(["none", "daily"]).default("none"),
    recurrenceStartDate: dateKey.nullable().default(null),
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
    if (v.recurrence === "daily") {
      if (!["task", "activity", "reminder"].includes(v.kind))
        ctx.addIssue({
          code: "custom",
          path: ["recurrence"],
          message:
            "A rotina diária está disponível para tarefas, atividades e lembretes",
        });
      if (!v.recurrenceStartDate)
        ctx.addIssue({
          code: "custom",
          path: ["recurrenceStartDate"],
          message: "Informe quando a rotina começa",
        });
      if (v.status !== "pending")
        ctx.addIssue({
          code: "custom",
          path: ["status"],
          message: "A conclusão da rotina é acompanhada por dia",
        });
    } else if (v.recurrenceStartDate) {
      ctx.addIssue({
        code: "custom",
        path: ["recurrenceStartDate"],
        message: "A data inicial só se aplica a uma rotina diária",
      });
    }
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
export type StoredEntryData = EntryInput & { completedDates?: string[] };
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
  completedDates?: string[];
  occurrenceDate?: string;
};
export const actionable = (e: Entry) =>
  !["subject", "material", "weekly"].includes(e.kind);
export const isOverdue = (e: Entry, now = new Date()) => {
  if (e.recurrence === "daily" && e.occurrenceDate)
    return (
      actionable(e) &&
      e.occurrenceDate < dayKey(now) &&
      !["completed", "cancelled"].includes(e.status)
    );
  return (
    actionable(e) &&
    !!e.startsAt &&
    new Date(e.endsAt ?? e.startsAt) < now &&
    !["completed", "cancelled"].includes(e.status)
  );
};
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
  const oneOffTasks = tasks.filter((e) => e.recurrence !== "daily");
  const routines = tasks.filter((e) => e.recurrence === "daily");
  const activeRoutinesToday = routines.filter(
    (e) => !!e.recurrenceStartDate && e.recurrenceStartDate <= day,
  );
  const today = oneOffTasks.filter(
    (e) => e.startsAt && dayKey(e.startsAt) === day,
  );
  const sessions = entries.filter(
    (e) => e.kind === "session" && e.status === "completed",
  );
  const todayCompleted =
    today.filter((e) => e.status === "completed").length +
    activeRoutinesToday.filter((e) => (e.completedDates ?? []).includes(day))
      .length;
  const weekStart = shiftDay(day, -6);
  const week = oneOffTasks.filter(
    (e) =>
      e.startsAt &&
      dayKey(e.startsAt) >= weekStart &&
      dayKey(e.startsAt) <= day,
  );
  const routineWeek = weekDays(day).flatMap((routineDay) =>
    routines
      .filter(
        (e) => !!e.recurrenceStartDate && e.recurrenceStartDate <= routineDay,
      )
      .map((e) => ({
        ...e,
        status: (e.completedDates ?? []).includes(routineDay)
          ? ("completed" as const)
          : ("pending" as const),
      })),
  );
  const routineOccurrences = routines.reduce(
    (sum, e) =>
      sum + (e.recurrenceStartDate ? dayCount(e.recurrenceStartDate, day) : 0),
    0,
  );
  const routineCompletions = routines.reduce((sum, e) => {
    const startDate = e.recurrenceStartDate;
    if (!startDate) return sum;
    return (
      sum +
      (e.completedDates ?? []).filter(
        (completedDay) => completedDay <= day && completedDay >= startDate,
      ).length
    );
  }, 0);
  const overdueRoutines = routines.reduce((sum, e) => {
    if (!e.recurrenceStartDate) return sum;
    const startDate = e.recurrenceStartDate;
    const throughYesterday = shiftDay(day, -1);
    const pastOccurrences = dayCount(startDate, throughYesterday);
    const completed = (e.completedDates ?? []).filter(
      (completedDay) => completedDay >= startDate && completedDay < day,
    ).length;
    return sum + Math.max(0, pastOccurrences - completed);
  }, 0);
  const todayTotal = today.length + activeRoutinesToday.length;
  const completed =
    oneOffTasks.filter((e) => e.status === "completed").length +
    routineCompletions;
  return {
    total: oneOffTasks.length + routineOccurrences,
    completed,
    todayTotal,
    todayCompleted,
    todayPercent: todayTotal
      ? Math.round((todayCompleted / todayTotal) * 100)
      : 0,
    weekPercent:
      week.length + routineWeek.length
        ? Math.round(
            ((week.filter((e) => e.status === "completed").length +
              routineWeek.filter((e) => e.status === "completed").length) /
              (week.length + routineWeek.length)) *
              100,
          )
        : 0,
    studyMinutes: sessions.reduce((sum, e) => sum + e.durationMinutes, 0),
    sessions: sessions.length,
    overdue:
      oneOffTasks.filter((e) => isOverdue(e, date)).length + overdueRoutines,
  };
}

function shiftDay(day: string, amount: number) {
  const shifted = new Date(`${day}T12:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + amount);
  return shifted.toISOString().slice(0, 10);
}

function dayCount(start: string, end: string) {
  if (start > end) return 0;
  const from = new Date(`${start}T00:00:00.000Z`).getTime();
  const to = new Date(`${end}T00:00:00.000Z`).getTime();
  return Math.floor((to - from) / 86_400_000) + 1;
}

function weekDays(day: string) {
  return Array.from({ length: 7 }, (_, index) => shiftDay(day, index - 6));
}
