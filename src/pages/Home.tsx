import { Link } from "react-router-dom";
import { Photo, Reveal } from "../components";
import { address, maps, modalities, professors, wa } from "../content";
export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-art">
          <Photo
            hero
            name="hero"
            alt="Dois lutadores de kickboxing em combate no ringue"
          />
        </div>
        <div className="hero-copy">
          <span className="eyebrow">TREINO INDIVIDUAL • EVOLUÇÃO REAL</span>
          <h1>
            DISCIPLINA
            <br />
            MOVE VOCÊ
            <br />
            <em>MAIS LONGE.</em>
          </h1>
          <p>
            Kickboxing, Boxe e treinamento funcional com professor exclusivo. Da
            base ao alto rendimento, no seu ritmo.
          </p>
          <div className="actions">
            <Link className="button" to="/agendamento">
              Agendar minha aula <span>↗</span>
            </Link>
            <a className="text-link" href="#sobre">
              Conhecer o studio ↓
            </a>
          </div>
        </div>
        <div className="hero-bottom">
          <span>
            DESDE 2000
            <br />
            <b>Uma história dentro da luta.</b>
          </span>
          <div className="stats">
            <span>
              <strong>60</strong> minutos por aula
            </span>
            <span>
              <strong>01</strong> professor exclusivo
            </span>
            <span>
              <strong>+1</strong> convidado opcional
            </span>
          </div>
        </div>
      </section>
      <section id="sobre" className="section about">
        <Reveal className="about-copy">
          <span className="eyebrow">01 / NOSSA ESSÊNCIA</span>
          <h2>
            EXPERIÊNCIA
            <br />
            QUE VIRA
            <br />
            <em>EVOLUÇÃO.</em>
          </h2>
          <p>
            Fundada em 2000, a Hard Kick é uma equipe pioneira no Vale do
            Paraíba: a primeira da região reconhecida pela Confederação
            Brasileira e pela Associação Mundial de Kickboxing.
          </p>
          <p>
            Uma metodologia própria, construída na prática de competições no
            Brasil e no exterior, leva nossos alunos da base ao alto rendimento.
          </p>
          <Link className="text-link" to="/professores/diego">
            Conheça essa trajetória ↗
          </Link>
        </Reveal>
        <Reveal className="about-art">
          <Photo
            name="studio-area-treino-com-logo"
            alt="Área de treino oficial da Hard Kick, com sacos e logomarca"
          />
        </Reveal>
        <div className="experience">
          <span>EXPERIÊNCIA NO BRASIL E NO MUNDO</span>
          <p>
            WGP <i>/</i> Campeonatos Mundiais <i>/</i> Jungle Fight <i>/</i>{" "}
            Real Fight
          </p>
          <small>Estados Unidos, Europa e América do Sul.</small>
        </div>
      </section>
      <section className="section" id="modalidades">
        <Reveal>
          <span className="eyebrow">02 / ENCONTRE SEU MOVIMENTO</span>
          <h2>
            SEU OBJETIVO.
            <br />
            <em>NOSSO TREINO.</em>
          </h2>
        </Reveal>
        <div className="modality-layout">
          <Photo
            name="studio-area-treino-sacos"
            alt="Sacos de pancada e equipamentos disponíveis no studio"
          />
          <div>
            {modalities.map((m, i) => (
              <Link
                to={`/agendamento?modalidade=${m.id}`}
                className="modality-row"
                key={m.id}
              >
                <span>0{i + 1}</span>
                <div>
                  <h3>{m.name}</h3>
                  <p>{m.description}</p>
                </div>
                <b>↗</b>
              </Link>
            ))}
            <p>
              Aulas individuais ou em dupla: você e uma pessoa convidada, com um
              professor dedicado ao seu horário.
            </p>
          </div>
        </div>
      </section>
      <section className="section teachers-preview">
        <Reveal>
          <span className="eyebrow">03 / QUEM ENSINA VIVE A LUTA</span>
          <div className="section-line">
            <h2>
              EXPERIÊNCIA
              <br />
              <em>AO SEU LADO.</em>
            </h2>
            <Link className="text-link" to="/professores">
              Conheça a equipe ↗
            </Link>
          </div>
        </Reveal>
        <div className="teacher-grid">
          {professors.map((p) => (
            <Link
              className="teacher-card"
              key={p.id}
              to={`/professores/${p.id}`}
            >
              {p.image ? (
                <Photo name={p.image} alt={`Arte oficial de ${p.name}`} />
              ) : (
                <div className="no-portrait">
                  <img
                    src="/images/logo.webp"
                    alt=""
                    width="100"
                    height="127"
                  />
                  <span>
                    HARD KICK
                    <br />
                    <small>Perfil sem fotografia</small>
                  </span>
                </div>
              )}
              <small>{p.role}</small>
              <h3>
                {p.name} <span>↗</span>
              </h3>
              <p>Kickboxing · Boxe · Funcional</p>
            </Link>
          ))}
        </div>
      </section>
      <section id="estrutura" className="section structure">
        <Reveal>
          <span className="eyebrow">04 / O ESPAÇO PARA IR ALÉM</span>
          <h2>
            FOCO NO TREINO.
            <br />
            <em>EM CADA DETALHE.</em>
          </h2>
          <p>
            Conheça a estrutura real do Studio Hard Kick, no Jardim Aquarius.
          </p>
        </Reveal>
        <div className="gallery">
          <Photo
            name="studio-area-treino-ampla"
            alt="Vista ampla do espaço de treino"
          />
          <Photo
            name="studio-logo-corredor"
            alt="Entrada do studio e logomarca Hard Kick"
          />
          <Photo
            name="studio-equipamentos-e-frigobar"
            alt="Parede de equipamentos e frigobar"
          />
          <Photo
            name="studio-area-treino-grade"
            alt="Área de treino vista pela divisória"
          />
          <Photo
            name="studio-equipamentos-vertical"
            alt="Equipamentos de treino organizados na parede"
          />
        </div>
      </section>
      <section className="section contact" id="contato">
        <div>
          <span className="eyebrow">05 / SEU PRÓXIMO PASSO</span>
          <h2>
            VAMOS
            <br />
            TREINAR
            <br />
            <em>JUNTOS?</em>
          </h2>
          <p>
            Atendimento das 5h às 12h e das 15h às 20h. Consulte os horários de
            cada professor no agendamento.
          </p>
          <a
            className="button"
            href={wa(
              "Olá, Diego! Quero saber mais sobre as aulas da Hard Kick.",
            )}
            target="_blank"
            rel="noreferrer"
          >
            Falar com o Diego ↗
          </a>
          <div className="social">
            <a
              href="https://instagram.com/diegohardkick"
              target="_blank"
              rel="noreferrer"
            >
              @diegohardkick ↗
            </a>
            <a
              href="https://instagram.com/hardkickfightteam"
              target="_blank"
              rel="noreferrer"
            >
              @hardkickfightteam ↗
            </a>
          </div>
        </div>
        <Photo
          name="studio-recepcao"
          alt="Recepção oficial do Studio Hard Kick"
        />
        <div className="location">
          <div>
            <h3>JARDIM AQUARIUS</h3>
            <p>{address}</p>
            <a
              className="text-link"
              href={maps}
              target="_blank"
              rel="noreferrer"
            >
              Como chegar ↗
            </a>
          </div>
          <iframe
            title="Localização do Studio Hard Kick no Google Maps"
            src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ExerciseGym",
          name: "Studio Hard Kick",
          url: "https://studio-hardkick.joaopedrocoelhosilva14.workers.dev",
          telephone: "+5512997907760",
          foundingDate: "2000",
          address: {
            "@type": "PostalAddress",
            streetAddress:
              "Avenida Deputado Benedito Matarazzo, 5101, Alpamare Boulevard",
            addressLocality: "São José dos Campos",
            addressRegion: "SP",
            addressCountry: "BR",
          },
          sameAs: [
            "https://instagram.com/diegohardkick",
            "https://instagram.com/hardkickfightteam",
          ],
        })}
      </script>
    </>
  );
}
