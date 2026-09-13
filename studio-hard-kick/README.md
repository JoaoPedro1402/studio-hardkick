# Studio Hard Kick

Aplicação React + Vite + TypeScript, com frontend Netlify e backend Supabase. Usa somente as fotografias oficiais e a imagem dos dois lutadores no hero.

## Estado da entrega

Site e backend publicados. O Supabase gratuito contém a grade oficial, migrations, RLS, função de reservas, Vault e cron ativo. Concorrência, reservas, proteção de dados, login administrativo e confirmação/cancelamento foram testados na API real. A conta de Diego está autorizada; ele deve definir sua senha. Google Calendar fica desativado até receber as credenciais e Pix ainda precisa ser informado. Consulte `docs/PENDENCIAS.md`. GitHub foi dispensado: entrega em ZIP e publicação direta no Netlify.

## Executar

Requer Node 24. Copie `.env.example` para `.env.local` e configure as três variáveis `VITE_` com os valores públicos de `[build.environment]` em `netlify.toml`. A chave publishable é pública por definição; nunca utilize service_role no frontend. A conexão aponta para o banco real: faça testes de reserva identificados e limpe-os depois. Não inclua `.env.local` em versões distribuídas.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Testes de navegador (fixtures exclusivamente em `tests/`, nunca em produção):

```sh
npx playwright install chromium webkit
npm run test:e2e
```

## Estrutura

- `src/pages`: início, professores/perfis, agendamento, administração e privacidade.
- `src/content.ts`: conteúdo oficial e contatos comerciais.
- `src/api.ts`: cliente HTTP da Edge Function.
- `public/images`: imagens WebP em tamanhos responsivos.
- `supabase/migrations`: schema, grade oficial, RLS, constraints, funções atômicas e fila Calendar.
- `supabase/functions/hardkick`: endpoint público/administrativo com validação de autenticação no código.
- `supabase/functions/_shared`: validação e adaptador Calendar com JWT de conta de serviço.
- `supabase/ops/schedule.sql`: ativação do cron depois dos segredos Vault.
- `tests`: PostgreSQL embutido, adaptador Calendar e interface Chromium/WebKit.

## Documentação

1. [Configurar Supabase e publicação](docs/CONFIGURACAO.md)
2. [Google Calendar](docs/GOOGLE-CALENDAR.md)
3. [Manual do Diego](docs/MANUAL-DIEGO.md)
4. [Testes e limitações](docs/TESTES.md)
5. [Pendências](docs/PENDENCIAS.md)
6. [Arquitetura e manutenção](docs/ARQUITETURA.md)

## Regras centrais

A grade semanal é administrável no banco. O servidor valida disponibilidade e janela móvel de 24 horas a sete dias em `America/Sao_Paulo`. A aula dura 60 minutos. Reserva de um titular com no máximo um convidado. Índice único parcial e lock transacional impedem duplicação por professor/instante. Preço e consentimento ficam registrados na reserva. A consulta ignora pendências vencidas mesmo antes do cron.

Nenhum gateway bancário, automação não oficial de WhatsApp, cadastro público administrativo ou serviço pago é necessário pelo código. O uso de provedores continua sujeito às quotas do plano escolhido; não ative upgrades automaticamente.

## Versão publicada
https://studiohardkick.netlify.app — veja [publicação e limites](docs/PUBLICACAO.md).

