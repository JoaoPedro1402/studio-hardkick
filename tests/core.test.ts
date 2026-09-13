import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import {
  fullName,
  normalizePhone,
  validStart,
  transitionAllowed,
} from "../supabase/functions/_shared/validation";
const db = new PGlite();
const actor = "00000000-0000-4000-8000-000000000001";
let slots: any[] = [];
const query = (s: string, p: any[] = []) => db.query<any>(s, p);
async function reserve(
  p: string,
  t: Date,
  id = randomUUID(),
  guest: string | null = null,
) {
  return (
    await query(
      `select (public.hk_reserve($1,'kickboxing',$2,'Aluno Teste','5512999999999',$3,$4,'test-access')).*`,
      [p, t.toISOString(), guest, id],
    )
  ).rows[0];
}
beforeAll(async () => {
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`,
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/20260911212904_hardkick_core.sql",
      "utf8",
    ),
  );
  await query("insert into auth.users values($1)", [actor]);
  await query("insert into public.admin_users values($1)", [actor]);
  slots = (await query("select * from public.hk_availability()")).rows;
}, 60000);
afterAll(() => db.close());
describe("Validação no servidor", () => {
  it("normaliza WhatsApp com e sem país", () => {
    expect(normalizePhone("(12) 99999-9999")).toBe("5512999999999");
    expect(normalizePhone("+55 12 99999-9999")).toBe("5512999999999");
  });
  it("rejeita telefone incompleto, fixo e nome inválido", () => {
    for (const v of ["123", "1234567890", "+1 5551234567"])
      expect(() => normalizePhone(v)).toThrow();
    expect(() => fullName("Ana")).toThrow();
    expect(() => fullName("<script> X")).toThrow();
  });
  it("rejeita horários fracionados", () =>
    expect(() => validStart("2026-09-15T11:30:00Z")).toThrow());
  it("fecha estados terminais e prazo vencido", () => {
    expect(transitionAllowed("expired", "confirmed", 0, 0, 1)).toBe(false);
    expect(transitionAllowed("pending_payment", "confirmed", 100, 0, 100)).toBe(
      false,
    );
    expect(transitionAllowed("confirmed", "completed", 0, 100, 101)).toBe(
      false,
    );
  });
});
describe.sequential(
  "PostgreSQL real embutido: regras, constraints e RLS",
  () => {
    it("carrega somente a grade oficial, três modalidades e 19 ocorrências semanais", async () => {
      expect(
        (await query("select count(*)::int n from public.weekly_availability"))
          .rows[0].n,
      ).toBe(19);
      expect(
        (await query("select count(*)::int n from public.modalities")).rows[0]
          .n,
      ).toBe(3);
    });
    it("disponibilidade respeita 24h, sete dias e hora cheia", () => {
      for (const s of slots) {
        expect(+s.starts_at - Date.now()).toBeGreaterThanOrEqual(
          86400000 - 1000,
        );
        expect(+s.starts_at - Date.now()).toBeLessThanOrEqual(604800000);
        expect(s.starts_at.getUTCMinutes()).toBe(0);
      }
    });
    it("permite professores diferentes no mesmo horário", async () => {
      const pair = slots.find(
        (s) =>
          s.professor_id === "diego" &&
          slots.some(
            (t) => t.professor_id === "tim" && +t.starts_at === +s.starts_at,
          ),
      );
      expect(pair).toBeTruthy();
      const a = await reserve("diego", pair.starts_at);
      const b = await reserve(
        "tim",
        pair.starts_at,
        randomUUID(),
        "Pessoa Convidada",
      );
      expect(a.id).not.toBe(b.id);
      expect(b.guest_name).toBe("Pessoa Convidada");
      expect(a.guest_name).toBe(null);
    });
    it("bloqueia imediatamente e rejeita duplicata", async () => {
      const s = slots.find((s) => s.professor_id === "mike");
      await reserve("mike", s.starts_at);
      expect(
        (
          await query("select * from public.hk_availability($1)", ["mike"])
        ).rows.some((t) => +t.starts_at === +s.starts_at),
      ).toBe(false);
      await expect(reserve("mike", s.starts_at)).rejects.toThrow(
        /unique|duplicate/,
      );
    });
    it("mantém idempotência sem segunda reserva", async () => {
      const s = (await query("select * from public.hk_availability()")).rows[0];
      const id = randomUUID();
      const a = await reserve(s.professor_id, s.starts_at, id);
      const b = await reserve(s.professor_id, s.starts_at, id);
      expect(a.id).toBe(b.id);
      expect(+new Date(a.expires_at) - +new Date(a.created_at)).toBe(1800000);
    });
    it("rejeita horário inexistente e antecedência inválida no banco", async () => {
      await expect(
        reserve("diego", new Date(Date.now() + 3600000)),
      ).rejects.toThrow();
      const d = new Date(slots[0].starts_at);
      d.setUTCHours(6);
      await expect(reserve("diego", d)).rejects.toThrow("invalid_time");
    });
    it("vencida fica livre sem cron e não aceita confirmação", async () => {
      const s = (await query("select * from public.hk_availability()")).rows[0];
      const b = await reserve(s.professor_id, s.starts_at);
      await query(
        "update public.bookings set expires_at=now()-interval '1 second' where id=$1",
        [b.id],
      );
      expect(
        (await query("select * from public.hk_availability()")).rows.some(
          (t) =>
            t.professor_id === s.professor_id && +t.starts_at === +s.starts_at,
        ),
      ).toBe(true);
      await expect(
        query("select public.hk_transition($1,'confirmed',$2)", [b.id, actor]),
      ).rejects.toThrow("reservation_expired");
      const newer = await reserve(s.professor_id, s.starts_at);
      expect(newer.id).not.toBe(b.id);
      expect(
        (await query("select status from public.bookings where id=$1", [b.id]))
          .rows[0].status,
      ).toBe("expired");
    });
    it("admin confirma e cancela; usuário não autorizado falha", async () => {
      const b = (
        await query(
          "select * from public.bookings where status='pending_payment' limit 1",
        )
      ).rows[0];
      await expect(
        query("select public.hk_transition($1,'confirmed',$2)", [
          b.id,
          randomUUID(),
        ]),
      ).rejects.toThrow("unauthorized");
      await query("select public.hk_transition($1,'confirmed',$2)", [
        b.id,
        actor,
      ]);
      await query("select public.hk_transition($1,'cancelled',$2)", [
        b.id,
        actor,
      ]);
      await expect(
        query("update public.bookings set status='confirmed' where id=$1", [
          b.id,
        ]),
      ).rejects.toThrow("invalid_transition");
    });
    it("bloqueio recorrente e liberação de somente uma data", async () => {
      const s = (await query("select * from public.hk_availability()")).rows[0];
      const local = new Date(+s.starts_at - 10800000);
      const d = local.toISOString().slice(0, 10);
      const args = {
        professor_id: s.professor_id,
        weekday: local.getUTCDay(),
        hour: local.getUTCHours(),
        enabled: true,
        blocked: true,
      };
      await query("select public.hk_admin_change($1,'weekly',$2)", [
        actor,
        JSON.stringify(args),
      ]);
      expect(
        (
          await query("select public.hk_slot_allowed($1,$2) ok", [
            s.professor_id,
            s.starts_at.toISOString(),
          ])
        ).rows[0].ok,
      ).toBe(false);
      await query("select public.hk_admin_change($1,'exception',$2)", [
        actor,
        JSON.stringify({
          professor_id: s.professor_id,
          date: d,
          hour: local.getUTCHours(),
          available: true,
        }),
      ]);
      expect(
        (
          await query("select public.hk_slot_allowed($1,$2) ok", [
            s.professor_id,
            s.starts_at.toISOString(),
          ])
        ).rows[0].ok,
      ).toBe(true);
      expect(
        (
          await query(
            "select public.hk_slot_allowed($1,$2::timestamptz+interval '7 days') ok",
            [s.professor_id, s.starts_at.toISOString()],
          )
        ).rows[0].ok,
      ).toBe(false);
    });
    it("cria extra e bloqueia ocorrência específica", async () => {
      const d = new Date(Date.now() + 172800000).toISOString().slice(0, 10);
      const data = { professor_id: "diego", date: d, hour: 6, available: true };
      await query("select public.hk_admin_change($1,'exception',$2)", [
        actor,
        JSON.stringify(data),
      ]);
      expect(
        (
          await query("select public.hk_slot_allowed($1,$2) ok", [
            "diego",
            d + "T06:00:00-03:00",
          ])
        ).rows[0].ok,
      ).toBe(true);
      data.available = false;
      await query("select public.hk_admin_change($1,'exception',$2)", [
        actor,
        JSON.stringify(data),
      ]);
      expect(
        (
          await query("select public.hk_slot_allowed($1,$2) ok", [
            "diego",
            d + "T06:00:00-03:00",
          ])
        ).rows[0].ok,
      ).toBe(false);
    });
    it("fila Calendar persistente, ID estável e revisões", async () => {
      const jobs = (await query("select * from public.hk_calendar_claim()"))
        .rows;
      expect(jobs.length).toBeGreaterThan(0);
      expect(jobs[0].event_id).toMatch(/^hk[0-9a-f]{32}$/);
      expect(jobs.every((j) => j.revision > j.synced_revision)).toBe(true);
      expect(
        (await query("select count(*)::int n from public.bookings")).rows[0].n,
      ).toBeGreaterThan(0);
    });
    it("rate limit e logs sem dados pessoais", async () => {
      for (let i = 0; i < 8; i++)
        expect(
          (await query("select public.hk_rate_limit('test-key') ok")).rows[0]
            .ok,
        ).toBe(true);
      expect(
        (await query("select public.hk_rate_limit('test-key') ok")).rows[0].ok,
      ).toBe(false);
      const logs = JSON.stringify(
        (await query("select details from public.audit_logs")).rows,
      );
      expect(logs).not.toContain("Aluno Teste");
      expect(logs).not.toContain("5512999999999");
    });
    it("anon não pode ler PII nem chamar RPC privilegiada", async () => {
      await db.exec("set role anon");
      await expect(query("select * from public.bookings")).rejects.toThrow(
        "permission denied",
      );
      await expect(
        query("select * from public.hk_availability()"),
      ).rejects.toThrow("permission denied");
      await db.exec("reset role");
    });
    it("authenticated sem admin tem zero registros por RLS", async () => {
      await db.exec("set role authenticated");
      expect((await query("select * from public.bookings")).rows).toHaveLength(
        0,
      );
      await db.exec("reset role");
    });
  },
);

it('duas solicitações disputando a mesma ocorrência têm somente uma vencedora',async()=>{const s=(await query('select * from public.hk_availability()')).rows[0];const outcomes=await Promise.allSettled([reserve(s.professor_id,s.starts_at),reserve(s.professor_id,s.starts_at)]);expect(outcomes.filter(o=>o.status==='fulfilled')).toHaveLength(1);expect(outcomes.filter(o=>o.status==='rejected')).toHaveLength(1);expect((await query("select count(*)::int n from public.bookings where professor_id=$1 and starts_at=$2 and status='pending_payment'",[s.professor_id,s.starts_at.toISOString()])).rows[0].n).toBe(1)});
it('aula concluída encerra apenas sua ocorrência e registra auditoria',async()=>{const s=(await query('select * from public.hk_availability()')).rows[0];const b=await reserve(s.professor_id,s.starts_at);await query("update public.bookings set starts_at=date_trunc('hour',now())-interval '2 hours',status='confirmed' where id=$1",[b.id]);await query('select public.hk_cleanup()');expect((await query('select status from public.bookings where id=$1',[b.id])).rows[0].status).toBe('completed');expect((await query('select count(*)::int n from public.audit_logs where entity_id=$1',[b.id])).rows[0].n).toBeGreaterThanOrEqual(3)});
