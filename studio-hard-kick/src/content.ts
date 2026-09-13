export const whatsapp = "5512997907760";
export const address =
  "Avenida Deputado Benedito Matarazzo, 5101, Jardim Aquarius, Alpamare Boulevard, São José dos Campos – SP";
export const maps = "https://maps.app.goo.gl/pv6gzX6aDX3C9dbg8";
export const modalities = [
  {
    id: "kickboxing",
    name: "Kickboxing",
    description: "Técnica, chutes e combinações. Da base ao alto rendimento.",
  },
  {
    id: "boxe",
    name: "Boxe",
    description: "Precisão, defesa e estratégia em cada movimento.",
  },
  {
    id: "funcional",
    name: "Treinamento funcional",
    description: "Força, mobilidade e condicionamento para o seu dia a dia.",
  },
];
export const professors = [
  {
    id: "diego",
    name: "Diego David",
    role: "Head Coach · Fundador e treinador",
    image: "professor-diego-david",
    bio: "Fundador da Hard Kick, Diego une experiência em competições e formação em Educação Física a uma metodologia própria de ensino.",
    facts: [
      "Pratica a modalidade desde 1993. Faixa-preta desde 2000.",
      "Graduado em Educação Física em 2007.",
      "Campeão Paulista, da Copa São Paulo, Brasileiro e Pan-Americano.",
      "Esteve entre os dez melhores do mundo.",
      "Top 3 do WGP Kickboxing por seis anos.",
      "Treinador da Seleção Brasileira no Campeonato Mundial de Juniores em Belgrado, Sérvia.",
    ],
  },
  {
    id: "mike",
    name: "Mike Ribeiro",
    role: "Treinador",
    image: "professor-mike-ribeiro",
    bio: "Faixa-preta e formado em Educação Física, Mike traz décadas de experiência para o acompanhamento de cada aluno.",
    facts: [
      "Faixa-preta.",
      "Formado em Educação Física.",
      "Décadas de experiência.",
    ],
  },
  {
    id: "tim",
    name: "Tim Leite",
    role: "Treinador",
    image: null,
    bio: "Faixa-preta e formado em Educação Física, Tim traz décadas de experiência para aulas com atenção à técnica e à evolução individual.",
    facts: [
      "Faixa-preta.",
      "Formado em Educação Física.",
      "Décadas de experiência.",
    ],
  },
];
export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
export const dateLabel = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
export const wa = (message: string, phone = whatsapp) =>
  `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
