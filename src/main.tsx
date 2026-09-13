import "@fontsource/barlow-condensed/latin-800.css";
import { lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { address, wa } from "./content";
import Home from "./pages/Home";
import "./style.css";
const Teachers = lazy(() => import("./pages/Teachers"));
const Booking = lazy(() => import("./pages/Booking"));
const Admin = lazy(() => import("./pages/Admin"));
const Privacy = lazy(() => import("./pages/Privacy"));
function App() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
    if (location.hash) {
      setTimeout(
        () => document.getElementById(location.hash.slice(1))?.scrollIntoView(),
        100,
      );
    } else window.scrollTo(0, 0);
    const titles: Record<string, string> = {
      "/": "Studio Hard Kick | Kickboxing, Boxe e Funcional",
      "/professores": "Professores | Studio Hard Kick",
      "/professores/diego": "Diego David | Studio Hard Kick",
      "/professores/mike": "Mike Ribeiro | Studio Hard Kick",
      "/professores/tim": "Tim Leite | Studio Hard Kick",
      "/agendamento": "Agendar aula | Studio Hard Kick",
      "/admin": "Administração | Studio Hard Kick",
      "/privacidade": "Privacidade | Studio Hard Kick",
    };
    const pathname = location.pathname.replace(/\/$/, "") || "/";
    document.title = titles[pathname] || "Studio Hard Kick";
    document
      .querySelector("link[rel=canonical]")
      ?.setAttribute(
        "href",
        `${import.meta.env.VITE_SITE_URL || "https://studiohardkick.netlify.app"}${pathname}`,
      );
    let robots = document.querySelector("meta[name=robots]");
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.append(robots);
    }
    robots.setAttribute(
      "content",
      location.pathname.startsWith("/admin")
        ? "noindex,nofollow"
        : "index,follow",
    );
  }, [location]);
  return (
    <>
      <a className="skip" href="#main">
        Pular para o conteúdo
      </a>
      <header className="site-header">
        <Link className="brand" to="/" >
          <img src="/images/logo.webp" width="44" height="56" alt="" />
          <span>
            <small>STUDIO</small>HARD KICK
          </span>
        </Link>
        <button
          className="menu-toggle"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          aria-controls="navigation"
          onClick={() => setOpen(!open)}
        >
          ☰
        </button>
        <nav
          id="navigation"
          className={open ? "open" : ""}
          aria-label="Navegação principal"
        >
          <Link to="/">Início</Link>
          <Link to="/#sobre">O studio</Link>
          <Link to="/professores">Professores</Link>
          <Link to="/#contato">Contato</Link>
          <Link to="/agendamento">Agendamento ↗</Link>
        </nav>
        <Link className="button header-cta" to="/agendamento">
          Agendar aula ↗
        </Link>
      </header>
      <main id="main">
        <Suspense
          fallback={
            <div className="page">
              <p role="status">Carregando…</p>
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/professores" element={<Teachers />} />
            <Route path="/professores/:id" element={<Teachers />} />
            <Route path="/agendamento" element={<Booking />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/privacidade" element={<Privacy />} />
            <Route
              path="*"
              element={
                <section className="page">
                  <h1>Página não encontrada</h1>
                  <Link to="/">Voltar ao início</Link>
                </section>
              }
            />
          </Routes>
        </Suspense>
      </main>
      <footer>
        <div>
          <b>STUDIO HARD KICK</b>
          <p>{address}</p>
        </div>
        <div>
          <Link to="/privacidade">Privacidade</Link>
          <Link to="/admin">Acesso administrativo</Link>
          <a
            href={wa("Olá! Quero conhecer o Studio Hard Kick.")}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp ↗
          </a>
        </div>
        <small>DISCIPLINA • RESPEITO • EVOLUÇÃO</small>
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
