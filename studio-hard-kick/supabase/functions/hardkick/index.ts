declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };
import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import {
  fullName,
  normalizePhone,
  uuid,
  validStart,
} from "../_shared/validation.ts";
import { syncCalendar } from "../_shared/calendar.ts";
const env = (key: string) => Deno.env.get(key) || "";
const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const encoder = new TextEncoder();
let runtimeCache: { expires: number; values: Record<string, string> } | undefined;
async function runtimeConfig() {
  if (runtimeCache && runtimeCache.expires > Date.now()) return runtimeCache.values;
  const { data, error } = await db.rpc("hk_runtime_config");
  if (error) throw new Error("not_configured");
  runtimeCache = { expires: Date.now() + 60_000, values: data || {} };
  return runtimeCache.values;
}
async function hash(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", encoder.encode(value)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
async function signature(value: string) {
  const secret = env("RATE_LIMIT_SECRET") || (await runtimeConfig()).hardkick_rate_limit_secret || "";
  if (secret.length < 32) throw new Error("not_configured");
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return Array.from(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, encoder.encode(value)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
function safeBooking(b: Record<string, unknown>) {
  const { access_hash, idempotency_key, ...publicReceipt } = b;
  return publicReceipt;
}
async function settings() {
  const { data, error } = await db
    .from("site_settings")
    .select("price_cents,pix_key,pix_key_type,pix_holder")
    .eq("id", true)
    .single();
  if (error) throw new Error("database_unavailable");
  return {
    ...data,
    pix_key: data.pix_key || env("PIX_KEY") || null,
    pix_key_type: data.pix_key_type || env("PIX_KEY_TYPE") || null,
    pix_holder: data.pix_holder || env("PIX_HOLDER") || null,
  };
}
async function rpc(name: string, args: Record<string, unknown> = {}) {
  const r = await db.rpc(name, args);
  if (r.error)
    throw new Error(r.error.code === "23505" ? "slot_taken" : r.error.message);
  return r.data;
}
Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  let config: Record<string, string>;
  try { config = await runtimeConfig(); }
  catch { return new Response(JSON.stringify({ error: "Serviço temporariamente indisponível." }), { status: 503, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }); }
  const allowed = (env("ALLOWED_ORIGINS") || config.hardkick_allowed_origins || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const cors = {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : "null",
    Vary: "Origin",
    "Access-Control-Allow-Headers": "authorization,apikey,content-type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
  };
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: cors });
  if (origin && !allowed.includes(origin))
    return respond({ error: "Origem não autorizada." }, 403);
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST")
    return respond({ error: "Método não permitido." }, 405);
  try {
    const raw = await req.text();
    if (raw.length > 8192)
      return respond({ error: "Solicitação inválida." }, 413);
    const body = JSON.parse(raw);
    const action = body.action;
    if (action === "maintenance") {
      const expected = env("CRON_SECRET") || config.hardkick_cron_secret || "";
      if (
        expected.length < 32 ||
        req.headers.get("authorization") !== `Bearer ${expected}`
      )
        return respond({ error: "Acesso negado." }, 401);
      await rpc("hk_cleanup");
      await syncCalendar(db);
      return respond({ ok: true });
    }
    if (action === "availability") {
      const [slots, s] = await Promise.all([
        rpc("hk_availability", { p_professor: body.professor_id || null }),
        settings(),
      ]);
      return respond({
        slots,
        settings: {
          price_cents: s.price_cents,
          pix_key: null,
          pix_key_type: null,
          pix_holder: null,
        },
      });
    }
    if (action === "reserve") {
      if (body.honeypot || body.consent !== true)
        throw new Error("invalid_request");
      const phone = normalizePhone(body.phone);
      const name = fullName(body.student_name);
      const guest = body.guest_name == null ? null : fullName(body.guest_name);
      const id = uuid(body.idempotency_key);
      const token = await signature("receipt:" + id);
      const access = await hash(token);
      const { data: existing } = await db
        .from("bookings")
        .select("id,access_hash")
        .eq("idempotency_key", id)
        .maybeSingle();
      if (!existing) {
        const ip =
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown";
        const keys = await Promise.all([
          signature("ip:" + ip),
          signature("phone:" + phone),
        ]);
        for (const key of keys)
          if (!(await rpc("hk_rate_limit", { p_key: key })))
            return respond(
              {
                error:
                  "Limite de solicitações atingido. Tente mais tarde ou fale com o Diego.",
              },
              429,
            );
      }
      const b = await rpc("hk_reserve", {
        p_professor: body.professor_id,
        p_modality: body.modality_id,
        p_start: validStart(body.starts_at),
        p_name: name,
        p_phone: phone,
        p_guest: guest,
        p_idempotency: id,
        p_access_hash: access,
      });
      // Committed reservation and durable outbox exist before any external call.
      EdgeRuntime.waitUntil(syncCalendar(db).catch(() => {}));
      return respond(
        { booking: safeBooking(b), token, settings: await settings() },
        201,
      );
    }
    if (action === "booking_status") {
      const id = uuid(body.id);
      if (typeof body.token !== "string" || body.token.length !== 64)
        throw new Error("invalid_request");
      const { data: b, error } = await db
        .from("bookings")
        .select("*")
        .eq("id", id)
        .eq("access_hash", await hash(body.token))
        .single();
      if (error || !b)
        return respond({ error: "Reserva não encontrada." }, 404);
      if (
        b.status === "pending_payment" &&
        Date.parse(b.expires_at) <= Date.now()
      ) {
        b.status = "expired";
      }
      return respond({ booking: safeBooking(b), settings: await settings() });
    }
    const auth =
      req.headers.get("authorization")?.replace(/^Bearer /, "") || "";
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser(auth);
    if (authError || !user) return respond({ error: "Acesso negado." }, 401);
    const { data: admin } = await db
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!admin)
      return respond({ error: "Usuário sem autorização administrativa." }, 403);
    if (action === "admin_snapshot") {
      await rpc("hk_cleanup");
      const results = await Promise.all([
        db
          .from("bookings")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
        db
          .from("weekly_availability")
          .select("*")
          .order("weekday")
          .order("hour"),
        db
          .from("availability_exceptions")
          .select("*")
          .gte("date", new Date().toISOString().slice(0, 10))
          .order("date"),
        settings(),
        db
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        db
          .from("calendar_events")
          .select("booking_id,revision,synced_revision,last_error")
          .limit(500),
      ]);
      for (const r of results)
        if ("error" in r && r.error) throw new Error("database_unavailable");
      return respond({
        bookings: (results[0].data || []).map(safeBooking),
        weekly: results[1].data,
        exceptions: results[2].data,
        settings: results[3],
        audit: results[4].data,
        calendar: results[5].data,
      });
    }
    if (action === "transition") {
      if (!["confirmed", "cancelled", "completed"].includes(body.status))
        throw new Error("invalid_transition");
      const b = await rpc("hk_transition", {
        p_id: uuid(body.id),
        p_status: body.status,
        p_actor: user.id,
      });
      EdgeRuntime.waitUntil(syncCalendar(db).catch(() => {}));
      return respond({ booking: safeBooking(b) });
    }
    if (action === "admin_change") {
      if (!["weekly", "exception", "settings"].includes(body.kind))
        throw new Error("invalid_request");
      await rpc("hk_admin_change", {
        p_actor: user.id,
        p_kind: body.kind,
        p_data: body.data,
      });
      return respond({ ok: true });
    }
    return respond({ error: "Ação inválida." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const errors: Record<string, string> = {
      invalid_phone: "Informe um WhatsApp brasileiro válido com DDD.",
      invalid_name: "Informe o nome completo, entre 5 e 120 caracteres.",
      slot_taken: "Esse horário acabou de ser reservado. Escolha outro.",
      invalid_slot: "Este horário não está disponível.",
      invalid_time:
        "Escolha um horário válido, entre 24 horas e sete dias a partir de agora.",
      reservation_expired: "A reserva venceu e não pode ser confirmada.",
      invalid_transition: "Essa alteração de status não é permitida.",
      idempotency_conflict:
        "A solicitação já foi utilizada. Inicie uma nova reserva.",
    };
    return respond(
      {
        error:
          errors[message] ||
          "Não foi possível concluir a solicitação. Atualize e tente novamente.",
      },
      message === "slot_taken" ? 409 : 400,
    );
  }
});
