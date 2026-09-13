import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  api,
  configured,
  type Slot,
  type Booking,
  type Settings,
} from "../api";
import { dateLabel, modalities, professors, money, wa } from "../content";
import { Notice } from "../components";
type Result = { booking: Booking; token: string; settings: Settings };
const localDay = (value: string) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date(value));
export default function BookingPage() {
  const [params] = useSearchParams();
  const [modality, setModality] = useState(params.get("modalidade") || "");
  const [professor, setProfessor] = useState(params.get("professor") || "");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [day, setDay] = useState("");
  const [slot, setSlot] = useState("");
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [guest, setGuest] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    price_cents: 13500,
    pix_key: null,
    pix_key_type: null,
    pix_holder: null,
  });
  const requestId = useRef(crypto.randomUUID());
  const loadId = useRef(0);
  const load = () => {
    if (!configured) return;
    const current = ++loadId.current;
    setBusy(true);
    api<{ slots: Slot[]; settings: Settings }>("availability", {
      professor_id: professor || null,
    })
      .then((r) => {
        if (current === loadId.current) {
          setSlots(r.slots);
          setSettings(r.settings);
        }
      })
      .catch((e) => {
        if (current === loadId.current) setError(e.message);
      })
      .finally(() => {
        if (current === loadId.current) setBusy(false);
      });
  };
  useEffect(() => {
    setDay("");
    setSlot("");
    load();
  }, [professor]);
  useEffect(() => {
    if (!result) return;
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    const poll = setInterval(() => {
      api<{ booking: Booking }>("booking_status", {
        id: result.booking.id,
        token: result.token,
      })
        .then((r) =>
          setResult((old) => (old ? { ...old, booking: r.booking } : null)),
        )
        .catch(() => {});
    }, 10000);
    return () => {
      clearInterval(timer);
      clearInterval(poll);
    };
  }, [result?.booking.id]);
  useEffect(() => {
    if (!configured) return;
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("hardkick-receipt") || "null",
      );
      if (saved?.id && saved?.token)
        api<{ booking: Booking; settings: Settings }>("booking_status", saved)
          .then((r) => setResult({ ...r, token: saved.token }))
          .catch(() => sessionStorage.removeItem("hardkick-receipt"));
    } catch {}
  }, []);
  const dates = [
    ...new Set(
      slots.map((s) => localDay(s.starts_at)),
    ),
  ];
  const remaining = result
    ? Math.max(
        0,
        Math.ceil((new Date(result.booking.expires_at).getTime() - now) / 1000),
      )
    : 0;
  const expired =
    result &&
    (result.booking.status === "expired" ||
      (result.booking.status === "pending_payment" && remaining === 0));
  const summary = `${modalities.find((m) => m.id === modality)?.name || "Escolha a modalidade"} • ${professors.find((p) => p.id === professor)?.name || "Escolha o professor"} • ${slot ? dateLabel(slot) : "Selecione um horário"}`;
  async function submit() {
    setError("");
    setBusy(true);
    try {
      const r = await api<Result>("reserve", {
        professor_id: professor,
        modality_id: modality,
        starts_at: slot,
        student_name: name,
        phone,
        guest_name: guest ? guestName : null,
        consent,
        honeypot,
        idempotency_key: requestId.current,
      });
      setResult(r);
      try {
        sessionStorage.setItem(
          "hardkick-receipt",
          JSON.stringify({ id: r.booking.id, token: r.token }),
        );
      } catch {}
      setNow(Date.now());
      window.scrollTo(0, 0);
    } catch (e) {
      setError((e as Error).message);
      load();
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="page booking-page">
      <span className="eyebrow">SEU HORÁRIO. SEU PROFESSOR.</span>
      <h1>
        COMECE SUA
        <br />
        <em>EVOLUÇÃO.</em>
      </h1>
      <p>
        Aula de 60 minutos · Individual ou com um convidado ·{" "}
        {money(settings.price_cents)}
      </p>
      {!configured ? (
        <Notice>
          O agendamento online está em configuração. Nenhuma reserva será criada
          nesta versão até a conexão segura com o banco.{" "}
          <a
            href={wa("Quero agendar uma aula na Hard Kick.")}
            target="_blank"
            rel="noreferrer"
          >
            Fale com o Diego ↗
          </a>
        </Notice>
      ) : null}
      {result ? (
        <div className="payment" aria-live="polite">
          <span className="eyebrow">RESERVA {result.booking.code}</span>
          <h2>
            {expired
              ? "Reserva expirada"
              : result.booking.status === "confirmed"
                ? "Aula confirmada"
                : result.booking.status === "cancelled"
                  ? "Reserva cancelada"
                  : result.booking.status === "completed"
                    ? "Aula concluída"
                  : "Horário reservado"}
          </h2>
          <p>
            {dateLabel(result.booking.starts_at)} ·{" "}
            {professors.find((p) => p.id === result.booking.professor_id)?.name}
          </p>
          <p>
            {result.booking.student_name}
            {result.booking.guest_name ? ` + ${result.booking.guest_name}` : ""}
          </p>
          {result.booking.status === "pending_payment" && !expired ? (
            <>
              <p>
                Pagamento pendente. Envie o comprovante e aguarde a confirmação
                manual do Diego antes do vencimento.
              </p>
              <strong className="countdown" role="timer" aria-live="off" aria-label="Tempo restante">
                {Math.floor(remaining / 60)
                  .toString()
                  .padStart(2, "0")}
                :{(remaining % 60).toString().padStart(2, "0")}
              </strong>
              <h3>{money(result.booking.price_cents)}</h3>
              {result.settings.pix_key ? (
                <>
                  <p>
                    Chave Pix (
                    {result.settings.pix_key_type || "tipo não informado"}):
                  </p>
                  <code>{result.settings.pix_key}</code>
                  <p>
                    Titular:{" "}
                    {result.settings.pix_holder ||
                      "Titular ainda não configurado"}
                  </p>
                  <button
                    className="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          result.settings.pix_key!,
                        );
                        setCopied(true);
                      } catch {
                        setError(
                          "Não foi possível copiar. Selecione a chave e copie manualmente.",
                        );
                      }
                    }}
                  >
                    {copied ? "Chave copiada ✓" : "Copiar chave Pix"}
                  </button>
                </>
              ) : (
                <Notice>
                  Chave Pix ainda não configurada. Solicite as instruções de
                  pagamento ao Diego.
                </Notice>
              )}
              <p>
                O envio do comprovante não confirma o pagamento automaticamente.
              </p>
              <a
                className="button secondary"
                target="_blank"
                rel="noreferrer"
                href={wa(
                  `Olá, Diego! Comprovante da reserva ${result.booking.code}. Aluno: ${result.booking.student_name}. Modalidade: ${modalities.find((m) => m.id === result.booking.modality_id)?.name}. Professor: ${professors.find((p) => p.id === result.booking.professor_id)?.name}. Aula: ${dateLabel(result.booking.starts_at)}. Vou anexar o comprovante.`,
                )}
              >
                Enviar comprovante no WhatsApp ↗
              </a>
            </>
          ) : (
            <p>
              {expired
                ? "O prazo terminou e o horário foi liberado. Crie uma nova solicitação para consultar a disponibilidade."
                : "Consulte o Diego pelo WhatsApp se precisar alterar sua aula."}
            </p>
          )}
          <button
            className="text-button"
            onClick={() => {
              sessionStorage.removeItem("hardkick-receipt");
              setResult(null);
              requestId.current = crypto.randomUUID();
              setStep(1);
              setSlot("");
              load();
            }}
          >
            Consultar outros horários
          </button>
          {error ? <p className="error" role="alert">{error}</p> : null}
        </div>
      ) : (
        <div className="booking-shell">
          <div>
            <ol className="steps" aria-label="Etapas">
              <li className={step === 1 ? "current" : ""}>01 Aula</li>
              <li className={step === 2 ? "current" : ""}>02 Seus dados</li>
              <li className={step === 3 ? "current" : ""}>03 Revisão</li>
            </ol>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (step === 1) {
                  if (!slot) {
                    setError("Selecione um horário disponível.");
                    return;
                  }
                  setStep(2);
                } else if (step === 2) {
                  if (
                    !/^(?:55)?[1-9]{2}9\d{8}$/.test(phone.replace(/\D/g, ""))
                  ) {
                    setError(
                      "Informe um celular brasileiro com DDD e 9 dígitos.",
                    );
                    return;
                  }
                  setError("");
                  setStep(3);
                } else submit();
              }}
            >
              <div key={step} className="step-content">
                {step === 1 ? (
                  <>
                    <fieldset>
                      <legend>1. Escolha a modalidade</legend>
                      <div className="choices">
                        {modalities.map((m) => (
                          <button
                            key={m.id}
                            className={modality === m.id ? "selected" : ""}
                            aria-pressed={modality === m.id}
                            type="button"
                            onClick={() => {
                              setModality(m.id);
                              setSlot("");
                            }}
                          >
                            {m.name}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <fieldset disabled={!modality}>
                      <legend>2. Escolha o professor</legend>
                      <div className="choices">
                        {professors.map((p) => (
                          <button
                            key={p.id}
                            className={professor === p.id ? "selected" : ""}
                            aria-pressed={professor === p.id}
                            type="button"
                            onClick={() => setProfessor(p.id)}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <fieldset disabled={!professor || !modality}>
                      <legend>3. Escolha a data</legend>
                      <p className="help">
                        Próximos sete dias, com pelo menos 24 horas de
                        antecedência. Horário de São Paulo.
                      </p>
                      <div className="choices dates">
                        {dates.map((d) => (
                          <button
                            key={d}
                            type="button"
                            className={day === d ? "selected" : ""}
                            aria-pressed={day === d}
                            onClick={() => {
                              setDay(d);
                              setSlot("");
                            }}
                          >
                            {new Date(d + "T12:00:00-03:00").toLocaleDateString(
                              "pt-BR",
                              {
                                weekday: "short",
                                day: "2-digit",
                                month: "2-digit",
                                timeZone: "America/Sao_Paulo",
                              },
                            )}
                          </button>
                        ))}
                      </div>
                      {busy ? (
                        <p role="status">Consultando a agenda…</p>
                      ) : configured && professor && !dates.length ? (
                        <Notice>
                          Nenhum horário disponível nos próximos sete dias.{" "}
                          <button type="button" onClick={load}>
                            Atualizar
                          </button>
                        </Notice>
                      ) : null}
                    </fieldset>
                    <fieldset>
                      <legend>4. Horários disponíveis</legend>
                      <div className="choices times">
                        {slots
                          .filter((s) => localDay(s.starts_at) === day)
                          .map((s) => (
                            <button
                              type="button"
                              key={s.starts_at}
                              className={slot === s.starts_at ? "selected" : ""}
                              aria-pressed={slot === s.starts_at}
                              onClick={() => setSlot(s.starts_at)}
                            >
                              {new Date(s.starts_at).toLocaleTimeString(
                                "pt-BR",
                                {
                                  timeZone: "America/Sao_Paulo",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </button>
                          ))}
                      </div>
                    </fieldset>
                  </>
                ) : step === 2 ? (
                  <>
                    <label>
                      Nome completo
                      <input
                        autoComplete="name"
                        required
                        minLength={5}
                        maxLength={120}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </label>
                    <label>
                      WhatsApp com DDD
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        required
                        maxLength={20}
                        placeholder="(12) 99999-9999"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        aria-describedby={
                          error ? "phone-help booking-error" : "phone-help"
                        }
                        aria-invalid={error.includes("celular") || undefined}
                      />
                    </label>
                    <p className="help" id="phone-help">
                      Celular brasileiro, incluindo DDD.
                    </p>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={guest}
                        onChange={(e) => setGuest(e.target.checked)}
                      />
                      Vou levar uma pessoa convidada
                    </label>
                    {guest ? (
                      <label>
                        Nome completo do convidado
                        <input
                          required
                          minLength={5}
                          maxLength={120}
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                        />
                      </label>
                    ) : null}
                    <label className="honeypot" aria-hidden="true">
                      Website
                      <input
                        tabIndex={-1}
                        autoComplete="off"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <h3>Confira sua aula</h3>
                    <p>{summary}</p>
                    <p>
                      {name} · {phone}
                    </p>
                    <p>
                      {guest ? `Convidado: ${guestName}` : "Aula individual"}
                    </p>
                    <p>
                      {money(settings.price_cents)} · Pagamento por Pix, com
                      confirmação manual.
                    </p>
                    <label className="check">
                      <input
                        required
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                      />
                      <span>
                        Li a{" "}
                        <Link to="/privacidade" target="_blank">
                          política de privacidade
                        </Link>{" "}
                        e aceito o uso dos dados para este agendamento. Tenho
                        autorização para informar os dados do convidado, se
                        houver.
                      </span>
                    </label>
                    <Notice>
                      Após solicitar, o horário ficará reservado por 30 minutos.
                      A reserva só será confirmada após a conferência do
                      pagamento pelo Diego.
                    </Notice>
                  </>
                )}
              </div>
              {error ? (
                <p id="booking-error" className="error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="actions">
                {step > 1 ? (
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => {
                      setStep(step - 1);
                      setError("");
                    }}
                  >
                    Voltar
                  </button>
                ) : null}
                <button
                  className="button"
                  disabled={
                    busy ||
                    !configured ||
                    (step === 1 && (!slot || !modality || !professor))
                  }
                >
                  {busy
                    ? "Aguarde…"
                    : step === 3
                      ? "Confirmar solicitação →"
                      : "Continuar →"}
                </button>
              </div>
            </form>
          </div>
          <aside className="booking-aside" aria-live="polite">
            <span className="eyebrow">ATENÇÃO EXCLUSIVA</span>
            <h3>
              UM HORÁRIO.
              <br />
              SEU TREINO.
            </h3>
            <p>
              Você é o titular da reserva. Se quiser, traga um convidado para
              treinar com você.
            </p>
            <hr />
            <p>{summary}</p>
            <strong>{money(settings.price_cents)}</strong>
            <p className="help">60 minutos · máximo de duas pessoas</p>
            <p className="help">
              As instruções de Pix aparecem após a reserva.
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}
