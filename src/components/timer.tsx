"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { entryInput, type Entry, type EntryInput } from "@/lib/domain";
type TimerState = {
  seconds: number;
  runningSince: number | null;
  subject: string;
  startedAt: string | null;
  sessionId: string;
};
function initial(): TimerState {
  return {
    seconds: 0,
    runningSince: null,
    subject: "none",
    startedAt: null,
    sessionId: crypto.randomUUID(),
  };
}
export function StudyTimer({
  subjects,
  save,
  preview,
}: {
  subjects: Entry[];
  save: (data: EntryInput, id?: string) => Promise<void>;
  preview: boolean;
}) {
  const [state, setState] = useState<TimerState | null>(null);
  const [tick, setTick] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const hydrated = useRef(false);
  const storageKey = preview
    ? "assistance:preview:timer:v1"
    : "assistance:timer:v1";
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      setState(
        parsed &&
          typeof parsed.seconds === "number" &&
          typeof parsed.sessionId === "string"
          ? parsed
          : initial(),
      );
    } catch {
      setState(initial());
    }
    hydrated.current = true;
  }, [storageKey]);
  useEffect(() => {
    if (state && hydrated.current)
      localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);
  useEffect(() => {
    if (!state?.runningSince) return;
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state?.runningSince]);
  const elapsed = state
    ? state.seconds +
      (state.runningSince
        ? Math.max(0, Math.floor((tick - state.runningSince) / 1000))
        : 0)
    : 0;
  const pause = () =>
    setState((s) =>
      s
        ? {
            ...s,
            seconds:
              s.seconds +
              (s.runningSince
                ? Math.max(0, Math.floor((Date.now() - s.runningSince) / 1000))
                : 0),
            runningSince: null,
          }
        : s,
    );
  return (
    <div className="timer-panel">
      <div className="section-head">
        <h2>Hora de focar</h2>
        <span className="tiny-dot" />
      </div>
      <p>Um passo de cada vez.</p>
      <div className="timer-display" aria-live="off">
        {String(Math.floor(elapsed / 60)).padStart(2, "0")}
        <span>:</span>
        {String(elapsed % 60).padStart(2, "0")}
      </div>
      <Select
        value={state?.subject ?? "none"}
        onValueChange={(v) => setState((s) => (s ? { ...s, subject: v } : s))}
        disabled={!!state?.startedAt}
      >
        <SelectTrigger aria-label="Matéria do timer">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Estudo livre</SelectItem>
          {subjects.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="timer-actions">
        <Button
          variant="outline"
          size="icon"
          aria-label="Reiniciar timer"
          disabled={!state || busy}
          onClick={() => {
            if (!elapsed || window.confirm("Descartar o tempo desta sessão?"))
              setState(initial());
          }}
        >
          <RotateCcw size={16} />
        </Button>
        <Button
          disabled={!state || busy}
          onClick={() => {
            if (state?.runningSince) pause();
            else {
              setTick(Date.now());
              setState((s) =>
                s
                  ? {
                      ...s,
                      runningSince: Date.now(),
                      startedAt: s.startedAt ?? new Date().toISOString(),
                    }
                  : s,
              );
            }
          }}
        >
          {state?.runningSince ? (
            <>
              <Pause size={16} /> Pausar
            </>
          ) : (
            <>
              <Play size={16} /> Iniciar
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Salvar sessão"
          disabled={elapsed < 60 || busy}
          onClick={async () => {
            if (!state) return;
            pause();
            setBusy(true);
            setError("");
            try {
              await save(
                entryInput.parse({
                  kind: "session",
                  title: "Sessão de estudo",
                  subjectId: state.subject === "none" ? null : state.subject,
                  status: "completed",
                  startsAt: state.startedAt,
                  endsAt: new Date().toISOString(),
                  durationMinutes: Math.min(1440, Math.floor(elapsed / 60)),
                }),
                state.sessionId,
              );
              setState(initial());
            } catch (e) {
              setError(e instanceof Error ? e.message : "Erro ao salvar");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Check size={16} />
        </Button>
      </div>
      <small>Salve após pelo menos 1 minuto.</small>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
