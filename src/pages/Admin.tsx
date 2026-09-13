import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { api, configured, type Booking, type Settings } from "../api";
import { dateLabel, professors, modalities, money, wa } from "../content";
const client = configured
  ? createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          storage: sessionStorage,
          autoRefreshToken: true,
        },
      },
    )
  : null;
type Weekly = {
  id: number;
  professor_id: string;
  weekday: number;
  hour: number;
  enabled: boolean;
  blocked: boolean;
};
type Exception = {
  id: number;
  professor_id: string;
  date: string;
  hour: number;
  available: boolean;
};
type Snapshot = {
  bookings: Booking[];
  weekly: Weekly[];
  exceptions: Exception[];
  settings: Settings;
  audit: {
    id: number;
    actor: string;
    action: string;
    entity: string;
    created_at: string;
  }[];
  calendar: {
    booking_id: string;
    revision: number;
    synced_revision: number;
    last_error: string | null;
  }[];
};
const days = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];
const statuses: Record<string, string> = {
  pending_payment: "Aguardando pagamento",
  confirmed: "Confirmada",
  expired: "Expirada",
  cancelled: "Cancelada",
  completed: "Concluída",
};
export default function Admin() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSetup, setPasswordSetup] = useState(new URLSearchParams(window.location.search).get("definir-senha") === "1");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Snapshot | null>(null);
  const [tab, setTab] = useState("reservas");
  const [filter, setFilter] = useState("pending_payment");
  const [search, setSearch] = useState("");
  const [settings, setSettings] = useState<Settings>({
    price_cents: 13500,
    pix_key: null,
    pix_holder: null,
    pix_key_type: null,
  });
  const [professor, setProfessor] = useState("diego");
  const [weekday, setWeekday] = useState(1);
  const [hour, setHour] = useState(7);
  const [date, setDate] = useState("");
  const [mode, setMode] = useState("release");
  useEffect(() => {
    if (!client) return;
    const accessHash = new URLSearchParams(window.location.search).get("token_hash");
    if (accessHash) {
      window.history.replaceState(null, "", "/admin?definir-senha=1");
      client.auth.verifyOtp({ token_hash: accessHash, type: "recovery" }).then(({error}) => {
        if (error) setMessage("Este link de acesso venceu ou já foi usado. Solicite um novo link.");
        else setPasswordSetup(true);
      });
    }
    client.auth
      .getSession()
      .then(({ data }) => setToken(data.session?.access_token || ""));
    const { data: listener } = client.auth.onAuthStateChange(
      (event, session) => {
        setToken(session?.access_token || "");
        if (event === "PASSWORD_RECOVERY") setPasswordSetup(true);
      },
    );
    return () => listener.subscription.unsubscribe();
  }, []);
  async function refresh() {
    if (!token) return;
    try {
      const d = await api<Snapshot>("admin_snapshot", {}, token);
      setData(d);
      return d;
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  useEffect(() => {
    if (!token) {
      setData(null);
      return;
    }
    refresh().then((d) => {
      if (d) setSettings(d.settings);
    });
    const timer = setInterval(refresh, 5000);
    const channel = client
      ?.channel("admin-bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          refresh();
        },
      )
      .subscribe();
    return () => {
      clearInterval(timer);
      if (channel) client?.removeChannel(channel);
    };
  }, [token]);
  async function change(action: string, body: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    try {
      await api(action, body, token);
      await refresh();
      setMessage("Alteração registrada.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const filtered = data?.bookings.filter(
    (b) =>
      (!filter || b.status === filter) &&
      (!search ||
        `${b.student_name} ${b.phone}`
          .toLocaleLowerCase()
          .includes(search.toLocaleLowerCase())),
  );
  return (
    <section className="page admin">
      <span className="eyebrow">STUDIO HARD KICK / ADMINISTRAÇÃO</span>
      <h1>
        CONTROLE
        <br />
        <em>DA AGENDA.</em>
      </h1>
      {!configured ? (
        <p className="notice">
          Painel indisponível: conexão com Supabase ainda não configurada.
        </p>
      ) : token && passwordSetup ? (
        <form className="login" onSubmit={async (e) => {
          e.preventDefault();
          if (newPassword !== confirmPassword) { setMessage("As senhas devem ser iguais."); return; }
          setBusy(true);
          try {
            const { error } = await client!.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setPasswordSetup(false);
            setNewPassword(""); setConfirmPassword("");
            window.history.replaceState(null, "", "/admin");
            setMessage("Senha definida. Seu acesso continua restrito à autorização administrativa.");
          } catch { setMessage("Não foi possível definir a senha. Solicite um novo link de acesso."); }
          finally { setBusy(false); }
        }}>
          <h2>Defina sua senha</h2>
          <p>Use pelo menos 12 caracteres e uma senha exclusiva para este painel.</p>
          <label>Nova senha<input type="password" autoComplete="new-password" required minLength={12} value={newPassword} onChange={e=>setNewPassword(e.target.value)} /></label>
          <label>Repita a nova senha<input type="password" autoComplete="new-password" required minLength={12} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} /></label>
          <button className="button" disabled={busy}>{busy ? "Salvando…" : "Definir senha"}</button>
        </form>
      ) : !token ? (
        <form
          className="login"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const { error } = await client!.auth.signInWithPassword({
              email,
              password,
            });
            setMessage(
              error
                ? "Não foi possível entrar. Verifique suas credenciais."
                : "",
            );
            setPassword("");
            setBusy(false);
          }}
        >
          <p>Acesso exclusivo à administração. Não há cadastro público.</p>
          <label>
            E-mail
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="button" disabled={busy}>
            {busy ? "Entrando…" : "Entrar"}
          </button>
          <button type="button" className="text-button" disabled={busy} onClick={async () => {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setMessage("Informe seu e-mail para solicitar a recuperação."); return; }
            setBusy(true);
            try {
              const { error } = await client!.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/admin?definir-senha=1` });
              setMessage(error ? "Não foi possível solicitar a recuperação agora. Tente novamente mais tarde." : "Se o endereço estiver cadastrado, você receberá as instruções de recuperação.");
            } catch { setMessage("Não foi possível solicitar a recuperação agora."); }
            finally { setBusy(false); }
          }}>Esqueci minha senha</button>
        </form>
      ) : (
        <>
          <button
            className="text-button"
            onClick={() => { setPasswordSetup(false); client?.auth.signOut(); }}
          >
            Sair do painel
          </button>
          {data ? (
            <>
              <div
                className="admin-tabs"
                role="group"
                aria-label="Áreas administrativas"
              >
                {[
                  "reservas",
                  "grade",
                  "exceções",
                  "configurações",
                  "auditoria",
                ].map((t) => (
                  <button
                    key={t}
                    className={tab === t ? "selected" : ""}
                    onClick={() => setTab(t)}
                  >
                    {t === "reservas"
                      ? `Reservas (${data.bookings.filter((b) => b.status === "pending_payment").length})`
                      : t}
                  </button>
                ))}
              </div>
              {tab === "reservas" ? (
                <>
                  <div className="admin-toolbar">
                    <label>
                      Pesquisar aluno ou WhatsApp
                      <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                    <label>
                      Status
                      <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option value="">Todos</option>
                        {Object.entries(statuses).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="button secondary" onClick={refresh}>
                      Atualizar
                    </button>
                  </div>
                  <p className="help">
                    Atualização em tempo real, com verificação adicional a cada
                    5 segundos. Novas solicitações ficam destacadas. São
                    exibidas até 500 reservas recentes.
                  </p>
                  <div className="admin-list">
                    {filtered?.length ? (
                      filtered.map((b) => (
                        <article
                          className={`reservation ${b.status === "pending_payment" ? "new" : ""}`}
                          key={b.id}
                        >
                          <span className="eyebrow">{b.code}</span>
                          <h3>{b.student_name}</h3>
                          <span className="badge">{statuses[b.status]}</span>
                          <p>
                            {dateLabel(b.starts_at)} ·{" "}
                            {
                              professors.find((p) => p.id === b.professor_id)
                                ?.name
                            }
                          </p>
                          <p>
                            {
                              modalities.find((m) => m.id === b.modality_id)
                                ?.name
                            }{" "}
                            · {money(b.price_cents)} · {b.phone}
                          </p>
                          <p>
                            {b.guest_name
                              ? `Convidado: ${b.guest_name}`
                              : "Sem convidado"}
                          </p>
                          {b.status === "pending_payment" ? (
                            <p>Vence em {dateLabel(b.expires_at)}</p>
                          ) : null}
                          <div className="actions">
                            <a
                              className="button secondary"
                              target="_blank"
                              rel="noreferrer"
                              href={wa(
                                `Olá, ${b.student_name}! Sobre a reserva ${b.code} na Hard Kick, ${dateLabel(b.starts_at)}.`,
                                b.phone,
                              )}
                            >
                              WhatsApp do aluno ↗
                            </a>
                            {b.status === "pending_payment" ? (
                              <button
                                className="button"
                                disabled={
                                  busy ||
                                  new Date(b.expires_at).getTime() <= Date.now()
                                }
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Confirmar que o pagamento de ${b.code} foi conferido?`,
                                    )
                                  )
                                    change("transition", {
                                      id: b.id,
                                      status: "confirmed",
                                    });
                                }}
                              >
                                Confirmar pagamento
                              </button>
                            ) : null}
                            {["pending_payment", "confirmed"].includes(
                              b.status,
                            ) ? (
                              <button
                                className="button secondary"
                                disabled={busy}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Cancelar ${b.code} e liberar este horário?`,
                                    )
                                  )
                                    change("transition", {
                                      id: b.id,
                                      status: "cancelled",
                                    });
                                }}
                              >
                                Cancelar e liberar horário
                              </button>
                            ) : null}
                            <button
                              className="button secondary"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(
                                    `${b.code} | ${b.student_name} | ${b.phone} | ${dateLabel(b.starts_at)} | ${b.professor_id} | ${b.modality_id} | ${b.guest_name || "Sem convidado"}`,
                                  );
                                  setMessage("Dados copiados.");
                                } catch {
                                  setMessage(
                                    "Cópia indisponível neste navegador.",
                                  );
                                }
                              }}
                            >
                              Copiar dados
                            </button>
                          </div>
                          <p className="help">
                            Atualizado: {dateLabel(b.updated_at)}
                          </p>
                        </article>
                      ))
                    ) : (
                      <p>Nenhuma reserva encontrada.</p>
                    )}
                  </div>
                </>
              ) : tab === "grade" ? (
                <>
                  <h3>Grade semanal</h3>
                  <p>
                    Bloqueios recorrentes permanecem nas semanas seguintes.
                    Reservas já existentes devem ser canceladas individualmente.
                  </p>
                  <form
                    className="admin-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      change("admin_change", {
                        kind: "weekly",
                        data: {
                          professor_id: professor,
                          weekday,
                          hour,
                          enabled: mode !== "remove",
                          blocked: mode === "block",
                        },
                      });
                    }}
                  >
                    <label>
                      Professor
                      <select
                        value={professor}
                        onChange={(e) => setProfessor(e.target.value)}
                      >
                        {professors.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid-2">
                      <label>
                        Dia da semana
                        <select
                          value={weekday}
                          onChange={(e) => setWeekday(Number(e.target.value))}
                        >
                          {days.map((d, i) => (
                            <option key={d} value={i}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Hora cheia
                        <input
                          type="number"
                          min="0"
                          max="23"
                          required
                          value={hour}
                          onChange={(e) => setHour(Number(e.target.value))}
                        />
                      </label>
                    </div>
                    <label>
                      Operação
                      <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                      >
                        <option value="release">
                          Criar / liberar horário recorrente
                        </option>
                        <option value="block">
                          Bloquear horário recorrente (mensalista)
                        </option>
                        <option value="remove">
                          Desativar horário na grade
                        </option>
                      </select>
                    </label>
                    <button className="button" disabled={busy}>
                      Salvar grade
                    </button>
                  </form>
                  <div className="admin-list">
                    {data.weekly.map((w) => (
                      <div className="reservation" key={w.id}>
                        {professors.find((p) => p.id === w.professor_id)?.name}{" "}
                        · {days[w.weekday]} · {w.hour}h{" "}
                        <span className="badge">
                          {!w.enabled
                            ? "Desativado"
                            : w.blocked
                              ? "Bloqueado recorrente"
                              : "Disponível semanalmente"}
                        </span>
                        <button
                          className="button secondary"
                          onClick={() => {
                            setProfessor(w.professor_id);
                            setHour(w.hour);
                            setTab("exceções");
                            setMode("release");
                          }}
                        >
                          Liberar somente nesta data
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : tab === "exceções" ? (
                <>
                  <h3>Uma data específica</h3>
                  <p>
                    Esta alteração vale somente para a data escolhida. O
                    bloqueio semanal permanece.
                  </p>
                  <form
                    className="admin-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      change("admin_change", {
                        kind: "exception",
                        data: {
                          professor_id: professor,
                          date,
                          hour,
                          available: mode !== "block",
                        },
                      });
                    }}
                  >
                    <label>
                      Professor
                      <select
                        value={professor}
                        onChange={(e) => setProfessor(e.target.value)}
                      >
                        {professors.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid-2">
                      <label>
                        Data
                        <input
                          type="date"
                          required
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                        />
                      </label>
                      <label>
                        Hora cheia
                        <input
                          type="number"
                          min="0"
                          max="23"
                          required
                          value={hour}
                          onChange={(e) => setHour(Number(e.target.value))}
                        />
                      </label>
                    </div>
                    <label>
                      Ação
                      <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                      >
                        <option value="release">
                          Liberar somente nesta data / criar horário extra
                        </option>
                        <option value="block">
                          Bloquear somente nesta data
                        </option>
                      </select>
                    </label>
                    <button className="button" disabled={busy}>
                      Salvar exceção
                    </button>
                  </form>
                  {data.exceptions.map((ex) => (
                    <p className="reservation" key={ex.id}>
                      {ex.professor_id} · {ex.date} · {ex.hour}h ·{" "}
                      {ex.available ? "Liberado" : "Bloqueado"}
                    </p>
                  ))}
                </>
              ) : tab === "configurações" ? (
                <form
                  className="admin-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    change("admin_change", {
                      kind: "settings",
                      data: settings,
                    });
                  }}
                >
                  <h3>Preço e Pix</h3>
                  <p>O novo preço vale somente para novas reservas.</p>
                  <label>
                    Valor da aula (R$)
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      step="0.01"
                      required
                      value={settings.price_cents / 100}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          price_cents: Math.round(Number(e.target.value) * 100),
                        })
                      }
                    />
                  </label>
                  <label>
                    Chave Pix
                    <input
                      maxLength={200}
                      value={settings.pix_key || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, pix_key: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Tipo da chave
                    <input
                      maxLength={40}
                      value={settings.pix_key_type || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          pix_key_type: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Nome do titular
                    <input
                      maxLength={150}
                      value={settings.pix_holder || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, pix_holder: e.target.value })
                      }
                    />
                  </label>
                  <button className="button" disabled={busy}>
                    Salvar configurações
                  </button>
                </form>
              ) : (
                <>
                  <h3>Histórico de alterações</h3>
                  {data.audit.map((a) => (
                    <p className="reservation audit" key={a.id}>
                      {dateLabel(a.created_at)} · {a.entity} · {a.action}
                      <br />
                      Responsável: {a.actor || "Sistema / solicitação do aluno"}
                    </p>
                  ))}
                  <h3>Sincronização com Calendar</h3>
                  <p>
                    Fila pendente:{" "}
                    {
                      data.calendar.filter(
                        (c) => c.revision > c.synced_revision,
                      ).length
                    }
                    . A integração desativada mantém os itens aguardando
                    configuração.
                  </p>
                </>
              )}
            </>
          ) : (
            <p>Verificando autorização…</p>
          )}
        </>
      )}
      {message ? (
        <p className="notice" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}
    </section>
  );
}
