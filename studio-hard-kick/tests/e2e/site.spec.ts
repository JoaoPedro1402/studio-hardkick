import { test, expect } from "@playwright/test";
const widths = [320, 360, 390, 412, 430, 768, 1024, 1366, 1440];
// Fixtures are confined to automated tests. They never ship to the application.
const future = new Date();
future.setDate(future.getDate() + 3);
future.setUTCHours(12, 0, 0, 0);
const starts = future.toISOString();
const settings = {
  price_cents: 13500,
  pix_key: "CHAVE-EXCLUSIVA-DE-TESTE",
  pix_key_type: "teste",
  pix_holder: "Titular de Teste",
};
async function mock(page: any) {
  await page.route("**/functions/v1/hardkick", async (route: any) => {
    const body = route.request().postDataJSON();
    if (body.action === "availability")
      return route.fulfill({
        json: {
          slots: body.professor_id
            ? [{ professor_id: body.professor_id, starts_at: starts }]
            : [],
          settings: { ...settings, pix_key: null },
        },
      });
    if (body.action === "reserve")
      return route.fulfill({
        status: 201,
        json: {
          booking: {
            id: "00000000-0000-4000-8000-000000000001",
            code: "HK-TESTE",
            professor_id: body.professor_id,
            modality_id: body.modality_id,
            starts_at: starts,
            student_name: body.student_name,
            phone: body.phone,
            guest_name: body.guest_name,
            status: "pending_payment",
            expires_at: new Date(Date.now() + 1800000).toISOString(),
            price_cents: 13500,
          },
          token: "test-receipt",
          settings,
        },
      });
    return route.fulfill({ status: 401, json: { error: "Acesso negado." } });
  });
}
test("rotas públicas, imagens e nove larguras", async ({ page }) => {
  await mock(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "DISCIPLINA",
  );
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator(".hero img")).toHaveCount(1);
  }
  for (const route of [
    "/professores",
    "/professores/diego",
    "/professores/mike",
    "/professores/tim",
    "/privacidade",
    "/agendamento",
    "/admin",
  ]) {
    await page.goto(route);
    await expect(page.locator("main")).not.toBeEmpty();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});
test("menu mobile e links oficiais", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(
    page.getByRole("button", { name: "Fechar menu" }),
  ).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("link", { name: "Professores", exact: true }).click();
  await expect(page).toHaveURL(/professores/);
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Falar com o Diego ↗" }),
  ).toHaveAttribute("href", /^https:\/\/wa.me\/5512997907760/);
  await expect(
    page.getByRole("link", { name: "Como chegar ↗" }),
  ).toHaveAttribute("href", "https://maps.app.goo.gl/pv6gzX6aDX3C9dbg8");
});
for (const guest of [false, true])
  test(`fluxo visual com contrato de API isolado; convidado=${guest}`, async ({
    page, context, browserName,
  }) => {
    if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await mock(page);
    await page.goto("/agendamento");
    await page.getByRole("button", { name: "Kickboxing", exact: true }).click();
    await page
      .getByRole("button", { name: "Diego David", exact: true })
      .click();
    await page.locator(".dates button").first().click();
    await page.locator(".times button").first().click();
    await page.getByRole("button", { name: "Continuar →" }).click();
    await page.getByLabel("Nome completo", { exact: true }).fill("Aluno Teste");
    await page.getByLabel("WhatsApp com DDD").fill("123");
    await page.getByRole("button", { name: "Continuar →" }).click();
    await expect(page.getByRole("alert")).toContainText("celular brasileiro");
    await page.getByLabel("WhatsApp com DDD").fill("(12) 99999-9999");
    if (guest) {
      await page.getByLabel("Vou levar uma pessoa convidada").check();
      await page
        .getByLabel("Nome completo do convidado")
        .fill("Pessoa Convidada");
    }
    await page.getByRole("button", { name: "Continuar →" }).click();
    await page.getByRole("heading", {name:"Confira sua aula"}).waitFor();
    await page.getByRole("checkbox").focus();
    await page.getByRole("checkbox").press("Space");
    await expect(page.getByRole("checkbox")).toBeChecked();
    await page.getByRole("button", { name: "Confirmar solicitação →" }).click();
    await expect(
      page.getByRole("heading", { name: "Horário reservado" }),
    ).toBeVisible();
    await expect(page.getByText("HK-TESTE", { exact: false })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Enviar comprovante no WhatsApp ↗" }),
    ).toHaveAttribute("href", /HK-TESTE/);
    await expect(page.locator(".countdown")).toContainText(/29:|30:/);
    if (guest)
      await expect(
        page.getByText("Aluno Teste + Pessoa Convidada"),
      ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Copiar chave Pix" }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Copiar chave Pix" }).click();
    await expect(page.getByRole("button", { name: "Chave copiada ✓" })).toBeVisible();
  });
test("falha do backend não mostra reserva concluída", async ({ page }) => {
  await page.route("**/functions/v1/hardkick", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Serviço temporariamente indisponível." },
    }),
  );
  await page.goto("/agendamento");
  await page.getByRole("button", { name: "Boxe", exact: true }).focus();
  await page.getByRole("button", { name: "Boxe", exact: true }).press("Enter");
  await expect(page.getByRole("button", { name: "Boxe", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Mike Ribeiro", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("indisponível");
  await expect(
    page.getByRole("button", { name: "Continuar →" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "Horário reservado" }),
  ).toHaveCount(0);
});

test("horário extra às 23h usa a data de São Paulo", async ({ page }) => {
  const late = new Date(future); late.setUTCHours(2, 0, 0, 0);
  await page.route("**/functions/v1/hardkick", route => route.fulfill({json: {slots: [{professor_id:"diego",starts_at:late.toISOString()}],settings:{...settings,pix_key:null}}}));
  await page.goto("/agendamento");
  await page.getByRole("button",{name:"Kickboxing",exact:true}).click();
  await page.getByRole("button",{name:"Diego David",exact:true}).click();
  await page.locator(".dates button").first().click();
  await expect(page.getByRole("button",{name:"23:00",exact:true})).toBeVisible();
});

test("recuperação de senha envia somente ao Auth com redirecionamento do painel", async ({ page }) => {
  let requested = false;
  await page.route("**/auth/v1/recover**", route => {
    const body = route.request().postDataJSON();
    requested = body.email === "admin@example.invalid" && decodeURIComponent(route.request().url()).includes("/admin?definir-senha=1");
    return route.fulfill({json:{}});
  });
  await page.goto("/admin");
  await page.getByLabel("E-mail",{exact:true}).fill("admin@example.invalid");
  await page.getByRole("button",{name:"Esqueci minha senha"}).click();
  await expect(page.getByRole("status")).toContainText("Se o endereço estiver cadastrado");
  expect(requested).toBe(true);
});

test('painel: login, reservas, grade, exceções e configurações (API isolada)',async({page})=>{const id='00000000-0000-4000-8000-000000000001';const jwt=`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')}.test`;await page.route('**/auth/v1/token**',route=>route.fulfill({json:{access_token:jwt,refresh_token:'test-refresh',expires_in:3600,token_type:'bearer',user:{id,email:'admin@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{}}}}));const actions:any[]=[];await page.route('**/functions/v1/hardkick',async route=>{const body=route.request().postDataJSON();actions.push(body);if(body.action==='admin_snapshot')return route.fulfill({json:{bookings:[],weekly:[{id:1,professor_id:'diego',weekday:1,hour:7,enabled:true,blocked:true}],exceptions:[],settings:{...settings,pix_key:null},audit:[],calendar:[]}});return route.fulfill({json:{ok:true}})});await page.goto('/admin');await page.getByLabel('E-mail',{exact:true}).fill('admin@example.invalid');await page.getByLabel('Senha',{exact:true}).fill('test-only-password');await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.getByRole('button',{name:'grade',exact:true})).toBeVisible();await page.getByRole('button',{name:'grade',exact:true}).click();await page.getByRole('button',{name:'Liberar somente nesta data',exact:true}).click();await page.getByLabel('Data',{exact:true}).fill(future.toISOString().slice(0,10));await page.getByRole('button',{name:'Salvar exceção'}).click();await expect(page.getByRole('status')).toContainText('Alteração registrada');expect(actions.some(a=>a.action==='admin_change'&&a.kind==='exception'&&a.data.available===true)).toBe(true);await page.getByRole('button',{name:'configurações',exact:true}).click();await page.getByLabel('Valor da aula (R$)').fill('140');await page.getByRole('button',{name:'Salvar configurações'}).click();await expect(page.getByRole('status')).toContainText('Alteração registrada');expect(actions.some(a=>a.kind==='settings'&&a.data.price_cents===14000)).toBe(true);for(const width of widths){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)}});
