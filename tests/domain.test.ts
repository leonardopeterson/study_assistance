import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dayKey,
  entryInput,
  isOverdue,
  metrics,
  type Entry,
} from "../src/lib/domain";
function entry(input: Record<string, unknown>): Entry {
  return {
    ...entryInput.parse({ kind: "task", title: "Test", ...input }),
    id: crypto.randomUUID(),
    createdAt: "2026-09-30T00:00:00Z",
    updatedAt: "2026-09-30T00:00:00Z",
    googleEventId: null,
    googleEtag: null,
    calendarId: null,
    syncedAt: null,
    driveFileId: null,
    driveUrl: null,
  };
}
test("estatísticas começam com zero e não produzem NaN", () => {
  const m = metrics([], new Date("2026-09-30T15:00:00Z"));
  assert.equal(m.total, 0);
  assert.equal(m.studyMinutes, 0);
  assert.equal(m.todayPercent, 0);
  assert.equal(m.weekPercent, 0);
});
test("atraso é calculado sem substituir o estado", () => {
  const pending = entry({ startsAt: "2026-09-29T12:00:00Z" });
  assert.equal(isOverdue(pending, new Date("2026-09-30T12:00:00Z")), true);
  assert.equal(pending.status, "pending");
  assert.equal(isOverdue({ ...pending, status: "completed" }), false);
  assert.equal(isOverdue({ ...pending, status: "cancelled" }), false);
});
test("somente sessões concluídas entram no tempo de estudo", () => {
  const records = [
    entry({
      kind: "session",
      startsAt: "2026-09-30T12:00:00Z",
      durationMinutes: 25,
      status: "completed",
    }),
    entry({
      kind: "session",
      startsAt: "2026-09-30T12:00:00Z",
      durationMinutes: 40,
    }),
  ];
  assert.equal(metrics(records).studyMinutes, 25);
  assert.equal(metrics(records).sessions, 1);
});
test("datas perto da meia-noite usam o dia de São Paulo", () => {
  assert.equal(dayKey("2026-10-01T01:00:00Z"), "2026-09-30");
});
test("progresso combina registros reais e exclui matérias e materiais", () => {
  const records = [
    entry({ status: "completed", startsAt: "2026-09-30T12:00:00Z" }),
    entry({ startsAt: "2026-09-30T14:00:00Z" }),
    entry({ kind: "subject", title: "Matemática" }),
    entry({ kind: "material", title: "Apostila" }),
  ];
  const m = metrics(records, new Date("2026-09-30T15:00:00Z"));
  assert.equal(m.todayPercent, 50);
  assert.equal(m.total, 2);
});
test("compromisso exige início e término ordenados", () => {
  assert.equal(
    entryInput.safeParse({ kind: "event", title: "Evento" }).success,
    false,
  );
  assert.equal(
    entryInput.safeParse({
      kind: "event",
      title: "Evento",
      startsAt: "2026-09-30T15:00:00Z",
      endsAt: "2026-09-30T14:00:00Z",
    }).success,
    false,
  );
});
test("programação semanal exige dia e horário", () => {
  assert.equal(
    entryInput.safeParse({ kind: "weekly", title: "Estudar" }).success,
    false,
  );
  assert.equal(
    entryInput.safeParse({
      kind: "weekly",
      title: "Estudar",
      weekday: 2,
      time: "19:30",
    }).success,
    true,
  );
});
test("sessão concluída não pode ter duração vazia", () => {
  assert.equal(
    entryInput.safeParse({
      kind: "session",
      title: "Estudar",
      startsAt: "2026-09-30T15:00:00Z",
      status: "completed",
      durationMinutes: 0,
    }).success,
    false,
  );
});
