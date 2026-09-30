import { test, expect } from "@playwright/test";
test("cadastro, edição, conclusão, persistência e exclusão", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await page.getByLabel("Título", { exact: true }).fill("Revisar cálculo");
  await page
    .getByRole("button", { name: "Salvar registro", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Concluir Revisar cálculo" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Editar Revisar cálculo" }).click();
  await page.getByLabel("Título", { exact: true }).fill("Revisar derivadas");
  await page
    .getByRole("button", { name: "Salvar registro", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Concluir Revisar derivadas" })
    .click();
  await expect(
    page.getByRole("button", { name: "Reabrir Revisar derivadas" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Reabrir Revisar derivadas" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Editar Revisar derivadas" }).click();
  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await page
    .getByRole("button", { name: "Excluir registro", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Editar Revisar derivadas" }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("estatísticas vazias, matéria e timer com sessão real", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Estatísticas", exact: true }).click();
  await expect(page.getByText("Sua história começa aqui.")).toBeVisible();
  await page.getByRole("button", { name: "Estudos", exact: true }).click();
  await page.getByRole("button", { name: "Nova matéria", exact: true }).click();
  await page.getByLabel("Título", { exact: true }).fill("Matemática");
  await page
    .getByRole("button", { name: "Salvar registro", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Matemática" })).toBeVisible();
  await page.getByRole("button", { name: "Geral", exact: true }).click();
  await page.getByLabel("Buscar registros", { exact: true }).fill("Matemática");
  await expect(
    page.getByRole("heading", { name: "Resultados no seu espaço 1" }),
  ).toBeVisible();
  await expect(
    page.locator(".entry-main").filter({ hasText: "Matemática" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpar", exact: true }).click();
  await page.getByRole("button", { name: "Estudos", exact: true }).click();
  await page.clock.install();
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await page.clock.fastForward(65000);
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await page
    .getByRole("button", { name: "Salvar sessão", exact: true })
    .click();
  await page.getByRole("button", { name: "Estatísticas", exact: true }).click();
  await expect(
    page.getByText("1 sessões concluídas", { exact: true }),
  ).toBeVisible();
});
test("mobile: navegação, calendário e formulário sem transbordamento", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Buscar no celular" }).click();
  await page.getByLabel("Buscar registros no celular").fill("Nada cadastrado");
  await expect(
    page.getByText("Nenhum registro encontrado.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpar", exact: true }).click();
  await page.getByRole("button", { name: "Abrir navegação" }).click();
  await page.getByRole("button", { name: "Calendário", exact: true }).click();
  await expect(page.locator(".global-calendar")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Compromisso", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Término", { exact: true })).toBeVisible();
});
