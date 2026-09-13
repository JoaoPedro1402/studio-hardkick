import { Link, useParams } from "react-router-dom";
import { Photo } from "../components";
import { professors } from "../content";
export default function Teachers() {
  const { id } = useParams();
  const list = id ? professors.filter((p) => p.id === id) : professors;
  return (
    <div className="page">
      <span className="eyebrow">EQUIPE HARD KICK</span>
      <h1>
        QUEM ENSINA
        <br />
        <em>VIVE A LUTA.</em>
      </h1>
      <p>Formação, experiência e atenção à sua evolução.</p>
      {!list.length ? (
        <p>
          Professor não encontrado.{" "}
          <Link to="/professores">Conheça a equipe.</Link>
        </p>
      ) : (
        list.map((p) => (
          <section className="profile" key={p.id}>
            {p.image ? (
              <Photo
                name={p.image}
                alt={`Arte oficial identificada de ${p.name}`}
              />
            ) : (
              <div className="no-portrait">
                <img
                  src="/images/logo.webp"
                  width="120"
                  height="152"
                  alt="Hard Kick"
                />
                <p>Perfil sem fotografia</p>
              </div>
            )}
            <div>
              <span className="eyebrow">{p.role}</span>
              <h2>{p.name}</h2>
              <p>{p.bio}</p>
              <ul>
                {p.facts.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <p>Atende Kickboxing, Boxe e treinamento funcional.</p>
              <Link className="button" to={`/agendamento?professor=${p.id}`}>
                Agendar com {p.name.split(" ")[0]} ↗
              </Link>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
