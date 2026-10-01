"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { BarChart3, Clock3, CheckCircle2, Target } from "lucide-react";
import { dayKey, metrics, type Entry } from "@/lib/domain";
export function Statistics({ entries }: { entries: Entry[] }) {
  const m = metrics(entries);
  const sessions = entries.filter(
    (e) => e.kind === "session" && e.status === "completed",
  );
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return {
      name: d
        .toLocaleDateString("pt-BR", { weekday: "short" })
        .replace(".", ""),
      minutos: sessions
        .filter((e) => e.startsAt && dayKey(e.startsAt) === dayKey(d))
        .reduce((n, e) => n + e.durationMinutes, 0),
    };
  });
  const subjects = entries.filter((e) => e.kind === "subject");
  const scored = entries.filter(
    (e) =>
      ["exam", "mock"].includes(e.kind) &&
      e.status === "completed" &&
      e.score !== null,
  );
  if (!entries.some((e) => !["subject", "weekly", "material"].includes(e.kind)))
    return (
      <div className="stats-empty">
        <div className="empty-symbol">
          <BarChart3 size={32} />
        </div>
        <span className="eyebrow">CADA PASSO CONTA</span>
        <h2>Sua história começa aqui.</h2>
        <p>
          Conforme você registra tarefas e sessões de estudo,
          <br />
          seu progresso ganha forma. Sem números inventados.
        </p>
        <div className="empty-metrics">
          <span>
            <Clock3 /> Tempo de estudo
          </span>
          <span>
            <CheckCircle2 /> Conclusões
          </span>
          <span>
            <Target /> Desempenho
          </span>
        </div>
      </div>
    );
  return (
    <>
      <div className="metric-grid">
        <div className="metric">
          <span>Tempo de estudo</span>
          <strong>
            {Math.floor(m.studyMinutes / 60)}
            <small>h</small> {m.studyMinutes % 60}
            <small>min</small>
          </strong>
          <p>{m.sessions} sessões concluídas</p>
        </div>
        <div className="metric">
          <span>Registros concluídos</span>
          <strong>
            {m.completed}
            <small> / {m.total}</small>
          </strong>
          <p>
            {m.total ? Math.round((m.completed / m.total) * 100) : 0}% do total
          </p>
        </div>
        <div className="metric">
          <span>Desempenho médio</span>
          <strong>
            {scored.length
              ? (
                  scored.reduce((n, e) => n + e.score!, 0) / scored.length
                ).toFixed(1)
              : "—"}
            <small> / 100</small>
          </strong>
          <p>{scored.length} provas e simulados com resultado</p>
        </div>
      </div>
      <div className="panel chart-panel">
        <div className="section-head">
          <div>
            <h2>Seu ritmo de estudo</h2>
            <p>Minutos por dia · últimos 7 dias</p>
          </div>
          <span className="tag">Dados reais</span>
        </div>
        <div style={{ width: "100%", height: 260, minWidth: 0 }}>
          <ResponsiveContainer width="100%" height={260} minWidth={0}>
            <BarChart data={days}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
              />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "#17191c05" }}
                contentStyle={{
                  borderRadius: 16,
                  borderColor: "var(--border)",
                  background: "#fff",
                }}
              />
              <Bar
                dataKey="minutos"
                fill="#5d2a1a"
                radius={[5, 5, 0, 0]}
                maxBarSize={42}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="panel">
        <div className="section-head">
          <h2>Por matéria</h2>
        </div>
        {subjects.length ? (
          subjects.map((s) => {
            const minutes = sessions
              .filter((e) => e.subjectId === s.id)
              .reduce((n, e) => n + e.durationMinutes, 0);
            const count = entries.filter(
              (e) => e.subjectId === s.id && e.status === "completed",
            ).length;
            return (
              <div className="performance-row" key={s.id}>
                <span className={`subject-dot ${s.color}`} />
                <strong>{s.title}</strong>
                <span>{minutes} min de estudo</span>
                <span>{count} conclusões</span>
              </div>
            );
          })
        ) : (
          <p className="muted">
            Cadastre matérias para acompanhar cada uma separadamente.
          </p>
        )}
      </div>
    </>
  );
}
