"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { actionable, dayKey, labels, type Entry } from "@/lib/domain";
function monthCells(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from(
    { length: 42 },
    (_, i) => new Date(date.getFullYear(), date.getMonth(), i - offset + 1),
  );
}
export function MiniCalendar({
  date,
  onDate,
}: {
  date: Date;
  onDate: (d: Date) => void;
}) {
  const [month, setMonth] = useState(date);
  useEffect(() => {
    setMonth(date);
  }, [date]);
  return (
    <section className="mini-calendar">
      <div className="mini-calendar-heading">
        <strong>
          {month.toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          })}
        </strong>
        <div>
          <button
            aria-label="Mês anterior"
            onClick={() =>
              setMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
            }
          >
            <ChevronLeft size={14} />
          </button>
          <button
            aria-label="Próximo mês"
            onClick={() =>
              setMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
            }
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="mini-grid">
        {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
        {monthCells(month).map((d) => (
          <button
            key={d.toISOString()}
            aria-label={d.toLocaleDateString("pt-BR")}
            className={`${d.getMonth() !== month.getMonth() ? "other-month" : ""} ${dayKey(d) === dayKey(date) ? "selected" : ""}`}
            onClick={() => onDate(d)}
          >
            {d.getDate()}
          </button>
        ))}
      </div>
    </section>
  );
}
export function GlobalCalendar({
  date,
  items,
  onDate,
  edit,
  add,
}: {
  date: Date;
  items: Entry[];
  onDate: (d: Date) => void;
  edit: (e: Entry) => void;
  add: () => void;
}) {
  const scheduled = items.filter(actionable).filter((e) => e.startsAt);
  const dayItems = scheduled.filter(
    (e) => dayKey(e.startsAt!) === dayKey(date),
  );
  return (
    <>
      <section className="panel global-calendar">
        <div className="section-head">
          <h2>
            {date.toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <div className="calendar-buttons">
            <Button
              variant="outline"
              size="icon"
              aria-label="Mês anterior do calendário"
              onClick={() =>
                onDate(new Date(date.getFullYear(), date.getMonth() - 1, 1))
              }
            >
              <ChevronLeft size={17} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Próximo mês do calendário"
              onClick={() =>
                onDate(new Date(date.getFullYear(), date.getMonth() + 1, 1))
              }
            >
              <ChevronRight size={17} />
            </Button>
            <Button onClick={add}>
              <Plus size={16} /> Compromisso
            </Button>
          </div>
        </div>
        <div className="calendar-grid">
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
            <div key={d} className="calendar-weekday">
              {d}
            </div>
          ))}
          {monthCells(date).map((d) => (
            <div
              className={`calendar-cell ${d.getMonth() !== date.getMonth() ? "other-month" : ""} ${dayKey(d) === dayKey(date) ? "selected-day" : ""}`}
              key={d.toISOString()}
            >
              <button
                className="calendar-day"
                aria-label={`Selecionar ${d.toLocaleDateString("pt-BR")}`}
                onClick={() => onDate(d)}
              >
                {d.getDate()}
              </button>
              {scheduled
                .filter((e) => dayKey(e.startsAt!) === dayKey(d))
                .slice(0, 3)
                .map((e) => (
                  <button
                    className={`calendar-event ${e.status === "completed" ? "complete" : ""}`}
                    key={e.id}
                    onClick={() => edit(e)}
                  >
                    {e.title}
                  </button>
                ))}
              {scheduled.filter((e) => dayKey(e.startsAt!) === dayKey(d))
                .length > 3 && <small>Mais eventos</small>}
            </div>
          ))}
        </div>
      </section>
      <section className="panel selected-day-agenda">
        <div className="section-head">
          <h2>
            Agenda ·{" "}
            {date.toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "long",
            })}
          </h2>
        </div>
        {dayItems.length ? (
          dayItems.map((e) => (
            <button
              className="day-agenda-row"
              key={e.id}
              onClick={() => edit(e)}
            >
              <Clock3 size={16} />
              <span>
                {new Date(e.startsAt!).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <strong>{e.title}</strong>
              <Badge variant="outline">{labels[e.kind]}</Badge>
            </button>
          ))
        ) : (
          <p className="muted">Nenhum registro agendado para este dia.</p>
        )}
      </section>
    </>
  );
}
