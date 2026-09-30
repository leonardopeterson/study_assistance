import { test, expect } from "@playwright/test";
import { config } from "dotenv";
import { encode } from "next-auth/jwt";
config({ path: ".env.local", quiet: true });
test("interface conectada grava no Neon e recupera após recarregar", async ({
  page,
  context,
  baseURL,
}) => {
  test.skip(
    !process.env.TEST_CONNECTED,
    "Exige servidor configurado e branch de desenvolvimento",
  );
  const cookie = await encode({
    secret: process.env.AUTH_SECRET!,
    salt: "authjs.session-token",
    token: {
      email: process.env.ALLOWED_EMAIL,
      name: "Leonardo",
      sub: "test-owner",
    },
    maxAge: 300,
  });
  await context.addCookies([
    {
      name: "authjs.session-token",
      value: cookie,
      url: baseURL!,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const title = "TESTE AUTOMATIZADO - interface Neon";
  try {
    await page.goto("/");
    await expect(page.getByText("Prévia local", { exact: false })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: "Sair", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Adicionar", exact: true }).click();
    await page.getByLabel("Título", { exact: true }).fill(title);
    await page
      .getByRole("button", { name: "Salvar registro", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: `Concluir ${title}` }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("button", { name: `Concluir ${title}` }),
    ).toBeVisible();
    await page.getByRole("button", { name: `Concluir ${title}` }).click();
    await expect(
      page.getByRole("button", { name: `Reabrir ${title}` }),
    ).toBeVisible();
  } finally {
    const res = await context.request.get(baseURL + "/api/entries");
    if (res.ok()) {
      const items = await res.json();
      for (const item of items.filter(
        (e: { title: string }) => e.title === title,
      ))
        await context.request.delete(baseURL + `/api/entries/${item.id}`, {
          headers: { Origin: baseURL! },
        });
    }
  }
});
