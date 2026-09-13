import type { SupabaseClient } from "npm:@supabase/supabase-js@2.116.0";
const env = (key: string) => Deno.env.get(key) || "";
function b64(input: Uint8Array | string) {
  return btoa(typeof input === "string" ? input : String.fromCharCode(...input))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
async function googleToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64(
    JSON.stringify({
      iss: env("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
      scope: "https://www.googleapis.com/auth/calendar.events",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const pem = env("GOOGLE_PRIVATE_KEY")
    .replace(/\\n/g, "\n")
    .replace(/-----[^-]+-----/g, "")
    .replace(/\s/g, "");
  const key = await crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(header + "." + claims),
  );
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${b64(new Uint8Array(sig))}`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error("google_auth_failed");
  return (await res.json()).access_token;
}
export async function syncCalendar(db: SupabaseClient) {
  if (env("GOOGLE_CALENDAR_ENABLED") !== "true") return { enabled: false };
  const { data: jobs, error } = await db.rpc("hk_calendar_claim");
  if (error) throw new Error("calendar_queue_failed");
  if (!jobs?.length) return { enabled: true };
  let token: string;
  try {
    token = await googleToken();
  } catch {
    for (const job of jobs)
      await db
        .from("calendar_events")
        .update({
          locked_until: null,
          last_error: "google_auth_failed",
          next_attempt_at: new Date(Date.now() + 60000).toISOString(),
        })
        .eq("booking_id", job.booking_id)
        .eq("lease_token", job.lease_token);
    return { enabled: true, pending: true };
  }
  for (const job of jobs) {
    try {
      const { data: b, error } = await db
        .from("bookings")
        .select("*,professors(name),modalities(name)")
        .eq("id", job.booking_id)
        .single();
      if (error || !b) throw new Error("booking_read_failed");
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env("GOOGLE_CALENDAR_ID"))}/events`;
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      const expired =
        b.status === "expired" ||
        b.status === "cancelled" ||
        (b.status === "pending_payment" &&
          new Date(b.expires_at).getTime() <= Date.now());
      if (expired) {
        const res = await fetch(`${url}/${job.event_id}`, {
          method: "DELETE",
          headers,
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok && res.status !== 404 && res.status !== 410)
          throw new Error("google_delete_failed");
      } else {
        const event = {
          id: job.event_id,
          summary: `${b.status === "pending_payment" ? "AGUARDANDO PAGAMENTO" : b.status === "completed" ? "CONCLUÍDA" : "CONFIRMADO"} • ${b.professors.name} • ${b.code}`,
          description: `Reserva: ${b.code}\nAluno: ${b.student_name}\nWhatsApp: ${b.phone}\nModalidade: ${b.modalities.name}\nProfessor: ${b.professors.name}\nConvidado: ${b.guest_name || "Não"}\nVencimento: ${b.expires_at}`,
          start: { dateTime: b.starts_at, timeZone: "America/Sao_Paulo" },
          end: {
            dateTime: new Date(Date.parse(b.starts_at) + 3600000).toISOString(),
            timeZone: "America/Sao_Paulo",
          },
          extendedProperties: { private: { hardkickBooking: b.id } },
          visibility: "private",
        };
        let res = await fetch(`${url}/${job.event_id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(event),
          signal: AbortSignal.timeout(10000),
        });
        if (res.status === 404) {
          res = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(event),
            signal: AbortSignal.timeout(10000),
          });
          if (res.status === 409)
            res = await fetch(`${url}/${job.event_id}`, {
              method: "PUT",
              headers,
              body: JSON.stringify(event),
              signal: AbortSignal.timeout(10000),
            });
        }
        if (!res.ok) throw new Error("google_write_failed");
      }
      await db
        .from("calendar_events")
        .update({
          synced_revision: job.revision,
          locked_until: null,
          last_error: null,
          attempts: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("booking_id", job.booking_id)
        .eq("lease_token", job.lease_token);
    } catch {
      await db
        .from("calendar_events")
        .update({
          locked_until: null,
          attempts: job.attempts + 1,
          last_error: "calendar_sync_failed",
          next_attempt_at: new Date(
            Date.now() +
              Math.min(3600000, 30000 * 2 ** Math.min(job.attempts, 7)),
          ).toISOString(),
        })
        .eq("booking_id", job.booking_id)
        .eq("lease_token", job.lease_token);
    }
  }
  return { enabled: true };
}
