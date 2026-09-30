"use client";
import { useState } from "react";
import { ZodError } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IntegrationSwitch } from "@/components/ui/integration-switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  entryInput,
  kinds,
  labels,
  priorityLabels,
  statusLabels,
  type Entry,
  type EntryInput,
} from "@/lib/domain";

export function localDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
export function EntryForm({
  open,
  close,
  initial,
  kind,
  subjects,
  save,
  upload,
  preview,
  actions,
}: {
  open: boolean;
  close: () => void;
  initial?: Entry;
  kind: EntryInput["kind"];
  subjects: Entry[];
  save: (data: EntryInput, id?: string, integration?: boolean) => Promise<void>;
  upload: (form: FormData) => Promise<void>;
  preview: boolean;
  actions?: React.ReactNode;
}) {
  const [value, setValue] = useState<EntryInput>(
    initial ?? {
      ...entryInput.parse({ kind: "task", title: "Novo registro" }),
      title: "",
      kind,
    },
  );
  const [starts, setStarts] = useState(localDate(initial?.startsAt ?? null));
  const [ends, setEnds] = useState(localDate(initial?.endsAt ?? null));
  const [file, setFile] = useState<File>();
  const [fileId, setFileId] = useState("");
  const [busy, setBusy] = useState(false);
  const [integration, setIntegration] = useState(true);
  const [error, setError] = useState("");
  // The parent keys this form on each opening so draft state never leaks between records.
  const activeKind = initial ? initial.kind : value.kind;
  function field<K extends keyof EntryInput>(key: K, next: EntryInput[K]) {
    setValue((v) => ({ ...v, kind: activeKind, [key]: next }));
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !busy) close();
      }}
    >
      <DialogContent className="entry-dialog">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Editar" : "Adicionar"}{" "}
            {labels[activeKind].toLowerCase()}
          </DialogTitle>
          <DialogDescription>
            Organize os detalhes no seu ritmo.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const data = entryInput.parse({
                ...value,
                kind: activeKind,
                startsAt: starts ? new Date(starts).toISOString() : null,
                endsAt: ends ? new Date(ends).toISOString() : null,
              });
              if (activeKind === "material" && !initial && integration) {
                const form = new FormData();
                form.set("title", data.title);
                form.set("subjectId", data.subjectId ?? "");
                form.set("notes", data.notes);
                form.set("fileId", fileId);
                if (file) form.set("file", file);
                await upload(form);
              } else
                await save(
                  data,
                  initial?.id,
                  !initial && activeKind === "event" && integration,
                );
              close();
            } catch (err) {
              setError(
                err instanceof ZodError
                  ? err.issues.map((issue) => issue.message).join(". ")
                  : err instanceof Error
                    ? err.message
                    : "Não foi possível salvar",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="form-grid">
            {!initial && (
              <div className="full">
                <Label>Tipo</Label>
                <Select
                  value={activeKind}
                  onValueChange={(v) => field("kind", v as EntryInput["kind"])}
                >
                  <SelectTrigger aria-label="Tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {kinds.map((k) => (
                      <SelectItem key={k} value={k}>
                        {labels[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="full">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                required
                maxLength={200}
                value={value.title}
                onChange={(e) => field("title", e.target.value)}
                placeholder="O que você quer organizar?"
                autoFocus
              />
            </div>
            {activeKind !== "subject" && (
              <div className="full">
                <Label>Matéria</Label>
                <Select
                  value={value.subjectId ?? "none"}
                  onValueChange={(v) =>
                    field("subjectId", v === "none" ? null : v)
                  }
                >
                  <SelectTrigger aria-label="Matéria">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem matéria</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {!["subject", "material", "weekly"].includes(activeKind) && (
              <>
                <div>
                  <Label htmlFor="starts">Data / início</Label>
                  <Input
                    id="starts"
                    type="datetime-local"
                    value={starts}
                    onChange={(e) => setStarts(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="ends">Término</Label>
                  <Input
                    id="ends"
                    type="datetime-local"
                    value={ends}
                    onChange={(e) => setEnds(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Select
                    value={value.priority}
                    onValueChange={(v) =>
                      field("priority", v as EntryInput["priority"])
                    }
                  >
                    <SelectTrigger aria-label="Prioridade">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select
                    value={value.status}
                    onValueChange={(v) =>
                      field("status", v as EntryInput["status"])
                    }
                  >
                    <SelectTrigger aria-label="Estado">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {activeKind === "subject" && (
              <div>
                <Label>Cor</Label>
                <Select
                  value={value.color}
                  onValueChange={(v) =>
                    field("color", v as EntryInput["color"])
                  }
                >
                  <SelectTrigger aria-label="Cor">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries({
                      sage: "Verde",
                      blue: "Azul",
                      amber: "Amarelo",
                      rose: "Rosa",
                      violet: "Violeta",
                    }).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {["session", "weekly"].includes(activeKind) && (
              <div>
                <Label htmlFor="minutes">Duração (minutos)</Label>
                <Input
                  id="minutes"
                  type="number"
                  min={0}
                  max={1440}
                  value={value.durationMinutes}
                  onChange={(e) =>
                    field("durationMinutes", Number(e.target.value))
                  }
                />
              </div>
            )}
            {["exam", "mock"].includes(activeKind) && (
              <div>
                <Label htmlFor="score">Resultado (0 a 100)</Label>
                <Input
                  id="score"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={value.score ?? ""}
                  onChange={(e) =>
                    field(
                      "score",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                />
              </div>
            )}
            {activeKind === "weekly" && (
              <>
                <div>
                  <Label>Dia da semana</Label>
                  <Select
                    value={String(value.weekday ?? "")}
                    onValueChange={(v) => field("weekday", Number(v))}
                  >
                    <SelectTrigger aria-label="Dia da semana">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Domingo",
                        "Segunda",
                        "Terça",
                        "Quarta",
                        "Quinta",
                        "Sexta",
                        "Sábado",
                      ].map((d, i) => (
                        <SelectItem key={d} value={String(i)}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="time">Horário</Label>
                  <Input
                    id="time"
                    type="time"
                    value={value.time ?? ""}
                    onChange={(e) => field("time", e.target.value)}
                  />
                </div>
              </>
            )}
            {!initial && ["event", "material"].includes(activeKind) && (
              <div className="full">
                <IntegrationSwitch
                  label={`Adicionar também ao Google ${activeKind === "event" ? "Calendar" : "Drive"}`}
                  checked={integration}
                  onCheckedChange={setIntegration}
                  disabled={busy}
                  description={
                    integration
                      ? "O registro será vinculado à integração."
                      : activeKind === "material"
                        ? "Salva apenas o título e as anotações, sem enviar arquivo."
                        : "O compromisso ficará apenas no Assistance."
                  }
                />
              </div>
            )}
            {activeKind === "material" && !initial && integration && (
              <div className="full">
                <Label htmlFor="file">Arquivo (até 3 MB)</Label>
                <Input
                  id="file"
                  type="file"
                  disabled={preview}
                  onChange={(e) => setFile(e.target.files?.[0])}
                />
                <Label htmlFor="fileId">Ou ID de um arquivo do Drive</Label>
                <Input
                  id="fileId"
                  value={fileId}
                  onChange={(e) => setFileId(e.target.value)}
                  disabled={!!file || preview}
                />
                <p className="hint">
                  Arquivos existentes precisam estar autorizados ao app pelo
                  Google Picker. Nesta versão, uploads pelo Assistance têm
                  acesso garantido.
                </p>
                {preview && (
                  <p className="hint">
                    Conecte o Google para adicionar materiais reais.
                  </p>
                )}
              </div>
            )}
            <div className="full">
              <Label htmlFor="notes">Anotações</Label>
              <Textarea
                id="notes"
                maxLength={5000}
                value={value.notes}
                onChange={(e) => field("notes", e.target.value)}
                placeholder="Detalhes, referências ou um lembrete para você..."
              />
            </div>
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="dialog-footer">
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                busy || (preview && activeKind === "material" && integration)
              }
            >
              {busy ? "Salvando..." : "Salvar registro"}
            </Button>
          </div>
        </form>
        {actions}
      </DialogContent>
    </Dialog>
  );
}
