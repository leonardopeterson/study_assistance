import { test } from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";
import { encode } from "next-auth/jwt";
config({ path: ".env.local", quiet: true });
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
async function token(email = process.env.ALLOWED_EMAIL!) {
  return encode({
    secret: process.env.AUTH_SECRET!,
    salt: "authjs.session-token",
    token: { email, name: "Teste", sub: "test-owner" },
    maxAge: 300,
  });
}
async function call(
  path: string,
  method = "GET",
  body?: unknown,
  cookie?: string,
  origin = base,
) {
  return fetch(base + path, {
    method,
    headers: {
      ...(cookie ? { Cookie: `authjs.session-token=${cookie}` } : {}),
      ...(method !== "GET"
        ? { Origin: origin, "Content-Type": "application/json" }
        : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
test(
  "API exige autenticação e rejeita outra conta e origem",
  { skip: !process.env.TEST_API },
  async () => {
    assert.equal((await call("/api/entries")).status, 401);
    assert.equal(
      (
        await call(
          "/api/entries",
          "GET",
          undefined,
          await token("other@example.com"),
        )
      ).status,
      401,
    );
    assert.equal(
      (
        await call(
          "/api/entries",
          "POST",
          { kind: "task", title: "Teste" },
          await token(),
          "https://other.example",
        )
      ).status,
      403,
    );
  },
);
test(
  "CRUD real no Neon, vínculos de matéria e sessões idempotentes",
  { skip: !process.env.TEST_API },
  async () => {
    const cookie = await token();
    const ids: string[] = [];
    try {
      const subjectRes = await call(
        "/api/entries",
        "POST",
        { kind: "subject", title: "TESTE AUTOMATIZADO - matéria" },
        cookie,
      );
      assert.equal(subjectRes.status, 200);
      const subject = await subjectRes.json();
      ids.push(subject.id);
      const taskRes = await call(
        "/api/entries",
        "POST",
        {
          kind: "task",
          title: "TESTE AUTOMATIZADO - tarefa",
          subjectId: subject.id,
          priority: "high",
        },
        cookie,
      );
      assert.equal(taskRes.status, 200);
      const task = await taskRes.json();
      ids.push(task.id);
      assert.equal(
        (await call(`/api/entries/${subject.id}`, "DELETE", undefined, cookie))
          .status,
        400,
      );
      const updatedRes = await call(
        `/api/entries/${task.id}`,
        "PUT",
        { ...task, status: "completed" },
        cookie,
      );
      assert.equal(updatedRes.status, 200);
      assert.equal((await updatedRes.json()).status, "completed");
      const readRes = await call("/api/entries", "GET", undefined, cookie);
      assert(
        (await readRes.json()).some((e: { id: string }) => e.id === task.id),
      );
      const sessionId = crypto.randomUUID();
      const data = {
        kind: "session",
        title: "TESTE AUTOMATIZADO - sessão",
        status: "completed",
        startsAt: new Date().toISOString(),
        durationMinutes: 25,
      };
      ids.push(sessionId);
      for (let i = 0; i < 2; i++)
        assert.equal(
          (await call("/api/sessions", "POST", { id: sessionId, data }, cookie))
            .status,
          200,
        );
      const after = await (
        await call("/api/entries", "GET", undefined, cookie)
      ).json();
      assert.equal(
        after.filter((e: { id: string }) => e.id === sessionId).length,
        1,
      );
      assert.equal(
        (
          await call(
            "/api/calendar",
            "POST",
            { id: task.id, action: "push" },
            cookie,
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await call(
            "/api/entries",
            "POST",
            { kind: "event", title: "Sem datas" },
            cookie,
          )
        ).status,
        400,
      );
    } finally {
      for (const id of ids.reverse()) {
        const res = await call(
          `/api/entries/${id}`,
          "DELETE",
          undefined,
          cookie,
        );
        assert.equal(res.status, 200);
      }
    }
  },
);
