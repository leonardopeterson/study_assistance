"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { DropdownMenu } from "radix-ui";
import { IntegrationSwitch } from "@/components/ui/integration-switch";
import {
  Sparkle,
  LayoutDashboard,
  BookOpen,
  BarChart3,
  CalendarDays,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Check,
  Clock3,
  ListTodo,
  MoreHorizontal,
  SlidersHorizontal,
  Settings2,
  LogOut,
  UserRound,
  ChevronUp,
  ExternalLink,
  Link2,
  RefreshCw,
  Unlink,
  Menu,
  X,
  FolderOpen,
  CheckCheck,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { EntryForm } from "./entry-form";
import { StudyTimer } from "./timer";
import { EntryRow } from "./entry-row";
import { MiniCalendar, GlobalCalendar } from "./calendar";
import {
  actionable,
  dayKey,
  entryInput,
  isOverdue,
  labels,
  metrics,
  priorityLabels,
  type Entry,
  type EntryInput,
} from "@/lib/domain";
const Statistics = dynamic(
  () => import("./statistics").then((m) => m.Statistics),
  { loading: () => <p>Carregando métricas...</p> },
);
type View = "general" | "studies" | "statistics" | "calendar";
type FormState = { kind: EntryInput["kind"]; entry?: Entry; key: number };
async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Não foi possível concluir");
  return body;
}
function localEntry(data: EntryInput, id = crypto.randomUUID()): Entry {
  return {
    ...data,
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    googleEventId: null,
    googleEtag: null,
    calendarId: null,
    syncedAt: null,
    driveFileId: null,
    driveUrl: null,
  };
}

export function Dashboard({
  mode,
  name,
  email,
  signOutAction,
  connectAction,
}: {
  mode: "preview" | "connected";
  name: string;
  email?: string;
  signOutAction?: () => Promise<void>;
  connectAction?: () => Promise<void>;
}) {
  const preview = mode === "preview";
  const [view, setView] = useState<View>("general");
  const [items, setItems] = useState<Entry[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [studyTab, setStudyTab] = useState("subjects");
  const [form, setForm] = useState<FormState | null>(null);
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [settings, setSettings] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [deleteIntegration, setDeleteIntegration] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [connections, setConnections] = useState({
    calendar: false,
    drive: false,
  });
  const [mutating, setMutating] = useState(false);
  const refresh = useCallback(async () => {
    if (preview) return;
    setLoading(true);
    try {
      const [entries, integrations] = await Promise.all([
        request("/api/entries"),
        request("/api/integrations"),
      ]);
      setItems(entries);
      setConnections(integrations);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [preview]);
  useEffect(() => {
    setDate(new Date());
    if (preview) {
      try {
        const raw = localStorage.getItem("assistance:preview:entries:v1");
        if (raw) setItems(JSON.parse(raw));
      } catch {
        setError("Os dados locais não puderam ser carregados");
      }
      setLoading(false);
      setReady(true);
    } else {
      void refresh();
      setReady(true);
    }
  }, [preview, refresh]);
  useEffect(() => {
    if (ready && preview)
      localStorage.setItem(
        "assistance:preview:entries:v1",
        JSON.stringify(items),
      );
  }, [ready, preview, items]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  const subjects = items.filter((e) => e.kind === "subject");
  const m = metrics(items, date ?? new Date());
  const activeDate = date ?? new Date();
  const selectedDay = dayKey(activeDate);
  const today = date ? dayKey(new Date()) === selectedDay : true;
  const visible = useMemo(
    () =>
      items.filter(
        (e) =>
          e.title.toLowerCase().includes(query.toLowerCase()) ||
          e.notes.toLowerCase().includes(query.toLowerCase()),
      ),
    [items, query],
  );
  const daily = visible
    .filter(actionable)
    .filter(
      (e) =>
        e.kind !== "session" &&
        (!e.startsAt || dayKey(e.startsAt) === selectedDay),
    )
    .filter(
      (e) =>
        filter === "all" ||
        (filter === "overdue" ? isOverdue(e) : e.status === filter),
    );
  const upcoming = items
    .filter(actionable)
    .filter(
      (e) =>
        e.startsAt &&
        new Date(e.startsAt) > new Date() &&
        !["completed", "cancelled"].includes(e.status),
    )
    .sort((a, b) => a.startsAt!.localeCompare(b.startsAt!))
    .slice(0, 4);
  function open(kind: EntryInput["kind"] = "task", entry?: Entry) {
    setForm({ kind, entry, key: Date.now() });
  }
  function navigate(next: View) {
    setView(next);
    setMobileNav(false);
    setFilter("all");
  }
  async function save(data: EntryInput, id?: string, integration = false) {
    if (preview) {
      setItems((prev) =>
        id
          ? prev.map((e) =>
              e.id === id
                ? { ...e, ...data, updatedAt: new Date().toISOString() }
                : e,
            )
          : [localEntry(data), ...prev],
      );
    } else {
      const item = await request(id ? `/api/entries/${id}` : "/api/entries", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setItems((prev) =>
        id ? prev.map((e) => (e.id === id ? item : e)) : [item, ...prev],
      );
      if (!id && data.kind === "event" && integration) {
        try {
          const synced = await request("/api/calendar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: item.id, action: "push" }),
          });
          setItems((prev) =>
            prev.map((entry) => (entry.id === item.id ? synced : entry)),
          );
        } catch (error) {
          setError(
            `Registro salvo no Assistance, mas não enviado ao Calendar: ${error instanceof Error ? error.message : "Falha na integração"}. Abra o compromisso para tentar novamente.`,
          );
          return;
        }
      }
    }
    setNotice("Registro salvo");
  }
  async function saveSession(data: EntryInput, id?: string) {
    if (preview) {
      setItems((prev) =>
        prev.some((e) => e.id === id) ? prev : [localEntry(data, id), ...prev],
      );
    } else {
      const entry = await request("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, data }),
      });
      setItems((prev) => [entry, ...prev.filter((e) => e.id !== entry.id)]);
    }
    setNotice("Sessão de estudo salva");
  }
  async function complete(item: Entry) {
    if (mutating) return;
    setMutating(true);
    try {
      await save(
        entryInput.parse({
          ...item,
          status: item.status === "completed" ? "pending" : "completed",
        }),
        item.id,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar");
    } finally {
      setMutating(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    setMutating(true);
    try {
      if (preview) {
        if (
          deleting.kind === "subject" &&
          items.some((e) => e.subjectId === deleting.id)
        )
          throw new Error("Remova os vínculos da matéria antes de excluí-la");
      } else
        await request(
          `/api/entries/${deleting.id}?integration=${deleteIntegration ? "delete" : "keep"}`,
          { method: "DELETE" },
        );
      setItems((prev) => prev.filter((e) => e.id !== deleting.id));
      setDeleting(null);
      setNotice(
        deleteIntegration && deleting.driveFileId
          ? "Registro excluído. Arquivo movido para a lixeira do Drive."
          : deleteIntegration && deleting.googleEventId
            ? "Registro e evento do Calendar excluídos."
            : "Registro excluído do Assistance.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir");
      setDeleting(null);
    } finally {
      setMutating(false);
    }
  }
  async function sync(item: Entry, action: "push" | "pull" | "unlink") {
    setSyncBusy(true);
    try {
      if (preview)
        throw new Error(
          "Configure o Google OAuth para sincronizar eventos reais",
        );
      const synced = await request("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, action }),
      });
      setForm((f) =>
        f?.entry?.id === item.id
          ? { ...f, entry: synced, key: action === "pull" ? f.key + 1 : f.key }
          : f,
      );
      await refresh();
      setNotice(
        action === "unlink"
          ? "Vínculo removido. Evento Google preservado."
          : "Sincronização concluída",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao sincronizar");
    } finally {
      setSyncBusy(false);
    }
  }
  async function upload(form: FormData) {
    if (preview) throw new Error("Conecte o Google Drive primeiro");
    const item = await request("/api/drive", { method: "POST", body: form });
    setItems((prev) => [item, ...prev]);
    setNotice("Material salvo no Google Drive");
  }
  function shift(days: number) {
    setDate((d) => {
      const next = new Date(d ?? new Date());
      next.setDate(next.getDate() + days);
      return next;
    });
  }
  const titles = {
    general: "Geral",
    studies: "Estudos",
    statistics: "Estatísticas",
    calendar: "Calendário",
  };
  return (
    <div className="app-shell">
      {mobileNav && (
        <button
          className="nav-scrim"
          aria-label="Fechar navegação"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <div className="sidebar-scroll">
          <a className="brand" href="/" aria-label="Assistance">
            <span className="brand-icon">
              <Sparkle size={21} />
            </span>
            assistance<span className="brand-dot">.</span>
          </a>
          <div className="workspace-label">ESPAÇO PESSOAL</div>
          <nav aria-label="Navegação principal">
            {[
              { id: "general", label: "Geral", icon: LayoutDashboard },
              { id: "studies", label: "Estudos", icon: BookOpen },
              { id: "statistics", label: "Estatísticas", icon: BarChart3 },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`nav-item ${view === id ? "active" : ""}`}
                aria-current={view === id ? "page" : undefined}
                onClick={() => navigate(id as View)}
              >
                <Icon size={19} />
                {label}
                {view === id && <span className="nav-active-dot" />}
              </button>
            ))}
            <div className="nav-divider" />
            <button
              className={`nav-item ${view === "calendar" ? "active" : ""}`}
              onClick={() => navigate("calendar")}
            >
              <CalendarDays size={19} />
              Calendário
            </button>
          </nav>
          <MiniCalendar date={activeDate} onDate={setDate} />
        </div>
        <div className="sidebar-bottom">
          <div className="quiet-note">
            <span className="tiny-dot" /> Um pouco de organização.
            <br />
            <span>Mais espaço para você.</span>
          </div>
          <button className="nav-item" onClick={() => setSettings(true)}>
            <Settings2 size={18} />
            Integrações <ArrowUpRight size={15} />
          </button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="profile" aria-label="Abrir menu do perfil">
                <span className="avatar">{name.slice(0, 1)}</span>
                <div>
                  <strong>{name}</strong>
                  <small>Seu espaço pessoal</small>
                </div>
                <ChevronUp size={16} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="profile-menu"
                side="top"
                align="start"
                sideOffset={8}
                collisionPadding={12}
              >
                <DropdownMenu.Item onSelect={() => setProfileOpen(true)}>
                  <UserRound size={16} /> Perfil
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => setSettings(true)}>
                  <Settings2 size={16} /> Configurações
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item
                  disabled={!signOutAction}
                  onSelect={() => {
                    void signOutAction?.();
                  }}
                >
                  <LogOut size={16} /> Sair
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <Button
              variant="ghost"
              size="icon"
              className="mobile-menu"
              aria-label="Abrir navegação"
              onClick={() => setMobileNav(true)}
            >
              <Menu />
            </Button>
            <span>Meu espaço</span>
            <ChevronRight size={14} />
            <strong>{titles[view]}</strong>
          </div>
          <div className="topbar-tools">
            <Button
              variant="ghost"
              size="icon"
              className="mobile-menu"
              aria-label="Buscar no celular"
              onClick={() => setMobileSearch((s) => !s)}
            >
              <Search size={18} />
            </Button>
            <div className="search-field">
              <Search size={16} />
              <Input
                aria-label="Buscar registros"
                placeholder="Buscar no seu espaço..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Abrir calendário"
              onClick={() => navigate("calendar")}
            >
              <CalendarDays size={19} />
            </Button>
            <Button
              onClick={() => open(view === "studies" ? "subject" : "task")}
            >
              <Plus size={17} />
              <span>Adicionar</span>
            </Button>
          </div>
        </header>
        {mobileSearch && (
          <div className="mobile-search">
            <Input
              aria-label="Buscar registros no celular"
              placeholder="Buscar no seu espaço..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        )}
        {preview && (
          <div className="preview-banner">
            <span className="tiny-dot" /> Prévia local · seus registros ficam
            neste navegador até conectar Google e Neon.
            <button onClick={() => setSettings(true)}>
              Configurar <ArrowUpRight size={12} />
            </button>
          </div>
        )}
        <main className="main-content">
          <section className="page-heading">
            <div>
              <span className="eyebrow">
                {view === "general"
                  ? "VAMOS FAZER O DIA ACONTECER"
                  : view === "studies"
                    ? "CONHECIMENTO, UM PASSO DE CADA VEZ"
                    : view === "statistics"
                      ? "PROGRESSO QUE VOCÊ PODE VER"
                      : "TEMPO PARA O QUE IMPORTA"}
              </span>
              <h1>
                {view === "general"
                  ? `Olá, ${name}`
                  : view === "studies"
                    ? "Seu espaço de estudos"
                    : view === "statistics"
                      ? "Cada avanço conta"
                      : "Tudo no seu tempo"}
                <span className="heading-dot">.</span>
              </h1>
              <p>
                {view === "general"
                  ? "Um dia organizado abre espaço para o que importa."
                  : view === "studies"
                    ? "Organize o que aprender. Encontre seu ritmo."
                    : view === "statistics"
                      ? "Uma visão honesta do que você está construindo."
                      : "Sua rotina e seus estudos, em um só calendário."}
              </p>
            </div>
            <div className="date-navigation">
              <div className="date-caption">
                {date
                  ? activeDate.toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })
                  : "Seu dia"}
              </div>
              <div className="day-buttons">
                <Button variant="ghost" size="sm" onClick={() => shift(-1)}>
                  <ChevronLeft size={14} /> Ontem
                </Button>
                <Button
                  variant={today ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setDate(new Date())}
                >
                  Hoje
                </Button>
                <Button variant="ghost" size="sm" onClick={() => shift(1)}>
                  Amanhã <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </section>
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void refresh()}
                >
                  Tentar novamente
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Dispensar erro"
                  onClick={() => setError("")}
                >
                  <X size={16} />
                </Button>
              </div>
            </div>
          )}
          {loading ? (
            <div className="loading-state">Carregando seu espaço...</div>
          ) : (
            <>
              {query.trim() && (
                <section className="panel">
                  <div className="section-head">
                    <div>
                      <h2>
                        Resultados no seu espaço{" "}
                        <span className="count">{visible.length}</span>
                      </h2>
                      <p>Todas as áreas · busca por título e anotações</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setQuery("")}
                    >
                      Limpar
                    </Button>
                  </div>
                  {visible.length ? (
                    visible.map((item) => (
                      <EntryRow
                        key={item.id}
                        item={item}
                        subjects={subjects}
                        edit={() => open(item.kind, item)}
                        complete={() => void complete(item)}
                        disabled={mutating}
                      />
                    ))
                  ) : (
                    <p className="muted">Nenhum registro encontrado.</p>
                  )}
                </section>
              )}
              {!query.trim() && view === "general" && (
                <>
                  <div className="metric-grid">
                    <div className="metric">
                      <span>
                        <CheckCheck size={17} /> Progresso do dia
                      </span>
                      <strong>
                        {m.todayCompleted}
                        <small> / {m.todayTotal}</small>
                      </strong>
                      <div className="progress-track">
                        <span style={{ width: `${m.todayPercent}%` }} />
                      </div>
                      <p>
                        {m.todayTotal
                          ? `${m.todayPercent}% concluído · no seu ritmo`
                          : "O primeiro passo é organizar seu dia"}
                      </p>
                    </div>
                    <div className="metric">
                      <span>
                        <CalendarDays size={17} /> Progresso semanal
                      </span>
                      <strong>
                        {m.weekPercent}
                        <small>%</small>
                      </strong>
                      <p>Registros dos últimos 7 dias</p>
                      <span className="metric-decoration">
                        <ArrowUpRight size={25} />
                      </span>
                    </div>
                    <div className="metric">
                      <span>
                        <Clock3 size={17} /> Tempo de estudo
                      </span>
                      <strong>
                        {Math.floor(m.studyMinutes / 60)}
                        <small>h</small> {m.studyMinutes % 60}
                        <small>min</small>
                      </strong>
                      <p>{m.sessions} sessões concluídas no total</p>
                    </div>
                  </div>
                  <div className="dashboard-columns">
                    <div>
                      <section className="panel agenda-panel">
                        <div className="section-head">
                          <div>
                            <h2>
                              Seu dia em foco{" "}
                              <span className="count">{daily.length}</span>
                            </h2>
                            <p>Tarefas, atividades e compromissos.</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Adicionar tarefa"
                            onClick={() => open()}
                          >
                            <Plus size={20} />
                          </Button>
                        </div>
                        <div className="list-toolbar">
                          <div className="filter-tabs">
                            {[
                              { id: "all", label: "Tudo" },
                              { id: "pending", label: "Pendentes" },
                              { id: "completed", label: "Concluídas" },
                              { id: "overdue", label: "Atrasadas" },
                            ].map((f) => (
                              <button
                                key={f.id}
                                className={filter === f.id ? "selected" : ""}
                                onClick={() => setFilter(f.id)}
                              >
                                {f.label}
                              </button>
                            ))}
                          </div>
                          <SlidersHorizontal size={15} />
                        </div>
                        {daily.length ? (
                          <div className="entry-list">
                            {daily.map((item) => (
                              <EntryRow
                                key={item.id}
                                item={item}
                                subjects={subjects}
                                edit={() => open(item.kind, item)}
                                complete={() => void complete(item)}
                                disabled={mutating}
                              />
                            ))}
                          </div>
                        ) : (
                          <Empty
                            icon={ListTodo}
                            title={
                              query
                                ? "Nenhum registro encontrado"
                                : "Um novo dia, novas possibilidades."
                            }
                            text={
                              filter !== "all"
                                ? "Nenhum registro neste filtro."
                                : "Adicione sua primeira tarefa e dê um passo de cada vez."
                            }
                            action={() => open()}
                            actionLabel="Adicionar tarefa"
                          />
                        )}
                        <div className="panel-bottom">
                          <span>
                            <span className="tiny-dot" />{" "}
                            {m.overdue
                              ? `${m.overdue} registros atrasados no total`
                              : "Um passo de cada vez já é progresso."}
                          </span>
                          <button onClick={() => navigate("calendar")}>
                            Ver calendário <ArrowRight size={14} />
                          </button>
                        </div>
                      </section>
                      <section className="study-callout">
                        <div className="callout-icon">
                          <BookOpen size={24} />
                        </div>
                        <div>
                          <span className="eyebrow">APRENDA ALGO NOVO</span>
                          <h3>Seu próximo passo está nos estudos.</h3>
                          <p>Matérias, materiais e tempo para se concentrar.</p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => navigate("studies")}
                        >
                          Ir para estudos <ArrowUpRight size={16} />
                        </Button>
                      </section>
                    </div>
                    <aside className="right-rail">
                      <section className="panel deadlines-panel">
                        <div className="section-head">
                          <h2>Próximos prazos</h2>
                          <CalendarDays size={17} />
                        </div>
                        {upcoming.length ? (
                          upcoming.map((e) => (
                            <button
                              className="deadline"
                              key={e.id}
                              onClick={() => open(e.kind, e)}
                            >
                              <span className="deadline-date">
                                <strong>
                                  {new Date(e.startsAt!).getDate()}
                                </strong>
                                <small>
                                  {new Date(e.startsAt!)
                                    .toLocaleDateString("pt-BR", {
                                      month: "short",
                                    })
                                    .replace(".", "")}
                                </small>
                              </span>
                              <span>
                                <strong>{e.title}</strong>
                                <small>
                                  {labels[e.kind]} ·{" "}
                                  {priorityLabels[e.priority]}
                                </small>
                              </span>
                              <ChevronRight size={15} />
                            </button>
                          ))
                        ) : (
                          <div className="rail-empty">
                            <CalendarDays size={25} />
                            <p>Sem prazos por enquanto.</p>
                            <small>O que vem depois aparece aqui.</small>
                          </div>
                        )}
                      </section>
                      <StudyTimer
                        subjects={subjects}
                        save={saveSession}
                        preview={preview}
                      />
                    </aside>
                  </div>
                </>
              )}
              {!query.trim() && view === "studies" && (
                <>
                  <div className="study-summary">
                    <span>
                      <BookOpen size={17} />
                      <strong>{subjects.length}</strong> matérias
                    </span>
                    <span>
                      <Clock3 size={17} />
                      <strong>{m.studyMinutes}</strong> min de estudo
                    </span>
                    <span>
                      <CheckCheck size={17} />
                      <strong>{m.sessions}</strong> sessões concluídas
                    </span>
                  </div>
                  <div className="study-tabs">
                    {[
                      { id: "subjects", label: "Matérias" },
                      { id: "content", label: "Conteúdos" },
                      { id: "material", label: "Materiais" },
                      { id: "exam", label: "Provas e entregas" },
                      { id: "session", label: "Sessões" },
                      { id: "weekly", label: "Programação" },
                      { id: "mock", label: "Simulados" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setStudyTab(t.id)}
                        className={studyTab === t.id ? "selected" : ""}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="dashboard-columns">
                    <div>
                      {studyTab === "subjects" ? (
                        <>
                          <div className="section-head">
                            <h2>Suas matérias</h2>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => open("subject")}
                            >
                              <Plus size={15} /> Nova matéria
                            </Button>
                          </div>
                          {subjects.filter((s) =>
                            s.title.toLowerCase().includes(query.toLowerCase()),
                          ).length ? (
                            <div className="subject-grid">
                              {subjects
                                .filter((s) =>
                                  s.title
                                    .toLowerCase()
                                    .includes(query.toLowerCase()),
                                )
                                .map((s) => {
                                  const content = items.filter(
                                    (e) =>
                                      e.subjectId === s.id &&
                                      e.kind === "content",
                                  );
                                  const done = content.filter(
                                    (e) => e.status === "completed",
                                  ).length;
                                  return (
                                    <button
                                      className={`subject-card ${s.color}`}
                                      key={s.id}
                                      onClick={() => open("subject", s)}
                                    >
                                      <span className="subject-card-icon">
                                        <BookOpen size={22} />
                                      </span>
                                      <MoreHorizontal
                                        size={18}
                                        className="subject-more"
                                      />
                                      <h3>{s.title}</h3>
                                      <p>
                                        {content.length} conteúdos ·{" "}
                                        {
                                          items.filter(
                                            (e) =>
                                              e.kind === "material" &&
                                              e.subjectId === s.id,
                                          ).length
                                        }{" "}
                                        materiais
                                      </p>
                                      <div className="progress-track">
                                        <span
                                          style={{
                                            width: `${content.length ? (done / content.length) * 100 : 0}%`,
                                          }}
                                        />
                                      </div>
                                      <div className="subject-card-footer">
                                        <span>
                                          {done} / {content.length} concluídos
                                        </span>
                                        <ArrowUpRight size={16} />
                                      </div>
                                    </button>
                                  );
                                })}
                            </div>
                          ) : (
                            <section className="panel">
                              <Empty
                                icon={BookOpen}
                                title="O que você quer aprender?"
                                text="Comece com uma matéria. Depois, reúna conteúdos e materiais."
                                action={() => open("subject")}
                                actionLabel="Criar primeira matéria"
                              />
                            </section>
                          )}
                        </>
                      ) : (
                        <section className="panel">
                          <div className="section-head">
                            <div>
                              <h2>
                                {studyTab === "exam"
                                  ? "Provas e entregas"
                                  : studyTab === "weekly"
                                    ? "Sua semana de estudos"
                                    : labels[studyTab as EntryInput["kind"]] +
                                      (studyTab === "material" ? "is" : "")}
                              </h2>
                              <p>
                                {studyTab === "weekly"
                                  ? "Planejamento semanal; cada sessão realizada é registrada separadamente."
                                  : "Tudo o que você precisa, em um só lugar."}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                open(studyTab as EntryInput["kind"])
                              }
                            >
                              <Plus size={15} /> Adicionar
                            </Button>
                          </div>
                          {visible.filter((e) =>
                            studyTab === "exam"
                              ? ["exam", "delivery"].includes(e.kind)
                              : e.kind === studyTab,
                          ).length ? (
                            visible
                              .filter((e) =>
                                studyTab === "exam"
                                  ? ["exam", "delivery"].includes(e.kind)
                                  : e.kind === studyTab,
                              )
                              .sort(
                                (a, b) => (a.weekday ?? 0) - (b.weekday ?? 0),
                              )
                              .map((e) => (
                                <EntryRow
                                  key={e.id}
                                  item={e}
                                  subjects={subjects}
                                  edit={() => open(e.kind, e)}
                                  complete={() => void complete(e)}
                                  disabled={mutating}
                                />
                              ))
                          ) : (
                            <Empty
                              icon={
                                studyTab === "material" ? FolderOpen : BookOpen
                              }
                              title="Um espaço pronto para começar."
                              text="Seus registros aparecem aqui assim que forem adicionados."
                              action={() =>
                                open(studyTab as EntryInput["kind"])
                              }
                              actionLabel="Adicionar registro"
                            />
                          )}
                        </section>
                      )}
                    </div>
                    <aside className="right-rail">
                      <StudyTimer
                        subjects={subjects}
                        save={saveSession}
                        preview={preview}
                      />
                      <div className="panel study-tip">
                        <span className="eyebrow">NO SEU RITMO</span>
                        <h3>Consistência vale mais que pressa.</h3>
                        <p>
                          Registre uma sessão após estudar e acompanhe seu tempo
                          nas estatísticas.
                        </p>
                        <Button
                          variant="ghost"
                          onClick={() => navigate("statistics")}
                        >
                          Ver desempenho <ArrowUpRight size={15} />
                        </Button>
                      </div>
                    </aside>
                  </div>
                </>
              )}
              {!query.trim() && view === "statistics" && (
                <Statistics entries={items} />
              )}
              {!query.trim() && view === "calendar" && (
                <GlobalCalendar
                  date={activeDate}
                  items={visible}
                  onDate={setDate}
                  edit={(e) => open(e.kind, e)}
                  add={() => open("event")}
                />
              )}
            </>
          )}
          <footer className="app-footer">
            <span>
              assistance<span className="brand-dot">.</span>
            </span>
            <span>Mais clareza. Um dia de cada vez.</span>
          </footer>
        </main>
      </div>
      {form && (
        <EntryForm
          key={form.key}
          open
          close={() => setForm(null)}
          initial={form.entry}
          kind={form.kind}
          subjects={subjects}
          save={save}
          upload={upload}
          preview={preview}
          actions={
            form?.entry && (
              <div className="entry-floating-actions">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDeleting(form.entry!);
                    setDeleteIntegration(true);
                    setForm(null);
                  }}
                >
                  Excluir
                </Button>
                {form.entry.driveUrl && (
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={form.entry.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Abrir Drive <ExternalLink size={14} />
                    </a>
                  </Button>
                )}
                {form.entry.kind === "event" && (
                  <>
                    <Button
                      size="sm"
                      disabled={syncBusy}
                      onClick={() => void sync(form.entry!, "push")}
                    >
                      <Link2 size={14} />
                      {form.entry.googleEventId
                        ? "Enviar ao Google"
                        : "Sincronizar com Google"}
                    </Button>
                    {form.entry.googleEventId && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={syncBusy}
                          onClick={() => void sync(form.entry!, "pull")}
                        >
                          <RefreshCw size={14} /> Importar alteração
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={syncBusy}
                          onClick={() => void sync(form.entry!, "unlink")}
                        >
                          <Unlink size={14} /> Desvincular
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            )
          }
        />
      )}

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Perfil</DialogTitle>
            <DialogDescription>
              Sua conta pessoal no Assistance.
            </DialogDescription>
          </DialogHeader>
          <div className="profile-details">
            <span className="avatar">{name.slice(0, 1)}</span>
            <strong>{name}</strong>
            <p>{email ?? "Prévia local"}</p>
            <p className="hint">
              Seu perfil é vinculado à conta Google usada no login.
            </p>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={settings} onOpenChange={setSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações</DialogTitle>
            <DialogDescription>
              Google cuida dos seus eventos e materiais. Assistance reúne a
              organização.
            </DialogDescription>
          </DialogHeader>
          <div className="integration-row">
            <CalendarDays />
            <div>
              <strong>Google Calendar</strong>
              <p>
                {connections.calendar ? "Autorizado" : "Aguardando autorização"}
              </p>
            </div>
            <Badge variant="outline">
              {connections.calendar ? "Conectado" : "Pendente"}
            </Badge>
          </div>
          <div className="integration-row">
            <FolderOpen />
            <div>
              <strong>Google Drive</strong>
              <p>
                {connections.drive ? "Autorizado" : "Aguardando autorização"}
              </p>
            </div>
            <Badge variant="outline">
              {connections.drive ? "Conectado" : "Pendente"}
            </Badge>
          </div>
          <p className="hint">
            Somente compromissos escolhidos são enviados ao Calendar. Use
            “Enviar ao Google” ou “Importar alteração” em cada evento. Tarefas
            permanecem internas. Materiais enviados ficam no Drive.
          </p>
          {connectAction ? (
            <form action={connectAction}>
              <Button className="w-full" type="submit">
                Autorizar Calendar e Drive <ArrowUpRight size={16} />
              </Button>
            </form>
          ) : (
            <div className="setup-note">
              <strong>Configuração inicial</strong>
              <p>
                O banco Neon já está preparado. Preencha as credenciais Google
                OAuth em .env.local para ativar o login e as integrações. O guia
                está no README do projeto.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!deleting}
        onOpenChange={(v) => {
          if (!v) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este registro?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.title}” será removido do Assistance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {(deleting?.googleEventId || deleting?.driveFileId) && (
            <IntegrationSwitch
              label={
                deleting.googleEventId
                  ? "Excluir também do Google Calendar"
                  : "Mover também para a lixeira do Google Drive"
              }
              checked={deleteIntegration}
              onCheckedChange={setDeleteIntegration}
              disabled={mutating}
              description={
                deleteIntegration
                  ? deleting.googleEventId
                    ? "O evento vinculado também será excluído no Google."
                    : "O arquivo poderá ser recuperado pela lixeira do Drive."
                  : "O item no Google será preservado."
              }
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={mutating}
              onClick={(e) => {
                e.preventDefault();
                void remove();
              }}
            >
              Excluir registro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {notice && (
        <div className="toast" role="status">
          <Check size={16} />
          {notice}
        </div>
      )}
    </div>
  );
}
function Empty({
  icon: Icon,
  title,
  text,
  action,
  actionLabel,
}: {
  icon: typeof ListTodo;
  title: string;
  text: string;
  action: () => void;
  actionLabel: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-symbol">
        <Icon size={26} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      <Button variant="outline" size="sm" onClick={action}>
        <Plus size={15} />
        {actionLabel}
      </Button>
    </div>
  );
}
