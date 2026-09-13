import { test, expect, vi, afterEach, beforeAll } from "vitest";
import { syncCalendar } from "../supabase/functions/_shared/calendar";
let pem = "";
beforeAll(async () => {
  const key = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  pem =
    "-----BEGIN PRIVATE KEY-----\n" +
    Buffer.from(
      await crypto.subtle.exportKey("pkcs8", key.privateKey),
    ).toString("base64") +
    "\n-----END PRIVATE KEY-----";
});
afterEach(() => vi.unstubAllGlobals());
function setup(status = "pending_payment", enabled = true) {
  const updates: any[] = [];
  const job = {
    booking_id: "id",
    event_id: "hk123",
    revision: 2,
    lease_token: "lease",
    attempts: 0,
  };
  const booking = {
    id: "id",
    code: "HK-TEST",
    status,
    student_name: "Aluno Teste",
    phone: "5512999999999",
    modality_id: "boxe",
    guest_name: null,
    starts_at: new Date(Date.now() + 86400000 * 2).toISOString(),
    expires_at: new Date(Date.now() + 1800000).toISOString(),
    professors: { name: "Diego David" },
    modalities: { name: "Boxe" },
  };
  const chain: any = {
    eq: () => chain,
    then: (resolve: any) => Promise.resolve({ error: null }).then(resolve),
  };
  const db: any = {
    rpc: async () => ({ data: [job], error: null }),
    from: (table: string) => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: booking, error: null }) }),
      }),
      update: (value: any) => {
        updates.push({ table, value });
        return chain;
      },
    }),
  };
  vi.stubGlobal("Deno", {
    env: {
      get: (key: string) =>
        (
          ({
            GOOGLE_CALENDAR_ENABLED: enabled ? "true" : "false",
            GOOGLE_PRIVATE_KEY: pem,
            GOOGLE_SERVICE_ACCOUNT_EMAIL: "test@example.invalid",
            GOOGLE_CALENDAR_ID: "test-calendar",
          }) as any
        )[key],
    },
  });
  return { db, updates };
}
test("Calendar desativado não chama Google", async () => {
  const { db } = setup("pending_payment", false);
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  expect(await syncCalendar(db)).toEqual({ enabled: false });
  expect(fetch).not.toHaveBeenCalled();
});
test("cria provisório após 404, usando ID determinístico e fuso", async () => {
  const { db, updates } = setup();
  const calls: any[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, opts: any) => {
      calls.push({ url, ...opts });
      if (url.includes("oauth2"))
        return Response.json({ access_token: "test" });
      return opts.method === "PUT"
        ? new Response(null, { status: 404 })
        : Response.json({ id: "hk123" });
    }),
  );
  await syncCalendar(db);
  const insert = calls.find(
    (c) => c.method === "POST" && !c.url.includes("oauth2"),
  );
  const body = JSON.parse(insert.body);
  expect(body.id).toBe("hk123");
  expect(body.summary).toContain("AGUARDANDO PAGAMENTO");
  expect(body.start.timeZone).toBe("America/Sao_Paulo");
  expect(updates[0].value.synced_revision).toBe(2);
});
test("confirma atualizando evento existente sem duplicação", async () => {
  const { db } = setup("confirmed");
  const methods: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, opts: any) => {
      if (url.includes("oauth2"))
        return Response.json({ access_token: "test" });
      methods.push(opts.method);
      expect(JSON.parse(opts.body).summary).toContain("CONFIRMADO");
      return Response.json({});
    }),
  );
  await syncCalendar(db);
  expect(methods).toEqual(["PUT"]);
});
test("expiração remove evento; 404 é idempotente", async () => {
  const { db, updates } = setup("expired");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, opts: any) => {
      if (url.includes("oauth2"))
        return Response.json({ access_token: "test" });
      expect(opts.method).toBe("DELETE");
      return new Response(null, { status: 404 });
    }),
  );
  await syncCalendar(db);
  expect(updates[0].value.synced_revision).toBe(2);
});
test("falha Google preserva reserva e reagenda a fila sem PII no erro", async () => {
  const { db, updates } = setup();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url.includes("oauth2")
        ? Response.json({ access_token: "test" })
        : new Response(null, { status: 503 }),
    ),
  );
  await syncCalendar(db);
  expect(updates[0].table).toBe("calendar_events");
  expect(updates[0].value.last_error).toBe("calendar_sync_failed");
  expect(updates[0].value.synced_revision).toBeUndefined();
  expect(updates[0].value.attempts).toBe(1);
});
