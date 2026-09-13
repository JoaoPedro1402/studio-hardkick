# Relatório de testes

Executado em 11/09/2026, Windows, Node 24.20.0. Separação explícita entre execução local, fixtures de teste e integração externa.

## Resultado

- **25 testes Vitest aprovados**: 20 de validação/banco e 5 do adaptador Calendar.
- **18 testes de navegador aprovados** em Chromium e WebKit, incluindo acesso inicial, recuperação, cópia Pix, horário extra noturno, nove larguras, agendamento e painel. Suíte final encerrada com código zero em 12/09/2026.
- **Build de produção aprovado**, TypeScript estrito e rotas divididas.
- **Deno check aprovado** para a Edge Function e imports compartilhados.
- **npm audit: zero vulnerabilidades conhecidas** após atualização de React Router, Vitest e Playwright.

## Cobertura dos requisitos

| Requisito | Evidência e limite |
|---|---|
| Modalidade / professor | Interface testada; três modalidades oficiais e três professores no banco |
| Sete dias / antecedência de 24h / hora cheia | Funções SQL e validação testadas |
| Dois professores simultâneos | Duas reservas para professores distintos no mesmo instante, teste SQL aprovado |
| Titular / convidado | Banco e fluxo de interface com e sem convidado aprovados |
| WhatsApp brasileiro | Normalização e rejeição de entradas inválidas, servidor e interface |
| Bloqueio imediato / duplicação | Índice único e disponibilidade após inserção testados |
| Disputa de duas solicitações | Teste local e duas chamadas HTTP simultâneas à Edge Function real: respostas 201 e 409, somente uma reserva persistida |
| Reserva de 30 minutos | Diferença entre criação e vencimento validada; contador visual testado |
| Expiração sem cron | `expires_at` vencido deixa o slot livre antes da limpeza; nova reserva expira a anterior atomicamente |
| Confirmação / cancelamento | RPC administrativa e trigger de estados testadas; acesso não autorizado rejeitado |
| Bloqueio semanal / exceção pontual / extra | Testes SQL e formulário administrativo; semana seguinte mantém bloqueio |
| Aula concluída | Limpeza encerra a ocorrência e registra auditoria |
| Calendar provisório / confirmado / exclusão | Adaptador testado com respostas HTTP controladas, ID estável, fuso e estados |
| Falha Calendar | Item permanece pendente para retry e nenhuma reserva é apagada |
| Botão WhatsApp | Link e código de reserva conferidos; nenhuma mensagem enviada pelo teste |
| Pix | Botão e conteúdo exibidos no contrato de teste; Clipboard API implementada com tratamento de falha. Cópia em aparelho real depende da permissão do navegador |
| Autorização / PII anônima | Papel anon não lê bookings nem executa RPC; authenticated sem admin recebe zero registros |
| Menu / rotas | Início, professores, três perfis, privacidade, agendamento e admin testados |
| Responsividade | 320, 360, 390, 412, 430, 768, 1024, 1366 e 1440 px; sem rolagem horizontal nas verificações |
| Console | Sem exceções da aplicação nos fluxos públicos testados |
| Links / imagens | Destinos internos e links comerciais conferidos; imagens oficiais renderizadas; hero com uma ocorrência e dois lutadores visíveis |

## Métodos

`tests/core.test.ts` executa a migration original em PostgreSQL embutido PGlite, com papéis anon/authenticated/service_role e stub mínimo do schema Auth. Não é um banco Supabase remoto. Avisos de caminho do runtime Windows foram emitidos durante inicialização, mas SQL e asserções completaram com sucesso.

`tests/calendar.test.ts` executa o adaptador real com JWT RSA gerado no teste e HTTP controlado. Não prova que as credenciais do Google real estejam configuradas.

`tests/e2e/site.spec.ts` e `access.spec.ts` executam componentes reais em Chromium/WebKit. Fixtures de API são exclusivas aos testes, com nomes e chave claramente de teste; não são incluídas no bundle nem usadas como fallback no site. O login administrativo visual utiliza contrato Auth isolado. Auth → Edge → Postgres também foi testado remotamente, conforme registro abaixo. Google Calendar real continua pendente.

A inspeção manual foi feita primeiro no navegador integrado, incluindo menu, seleções, hero desktop/mobile e nove larguras. Playwright foi usado adicionalmente para automação e WebKit, conforme solicitado. WebKit com perfil iPhone aproxima o motor Safari; não equivale a teste físico em iPhone. Chromium com viewport/toque aproxima Android; não equivale a teste em todos os aparelhos.

## Performance

Lighthouse sobre build de produção local, perfil móvel padrão:

- Performance: **92/100**.
- Acessibilidade: **100/100**.
- Boas práticas: **100/100**.
- SEO: **100/100**.
- FCP: **1,5 s**; LCP: **2,9 s**; TBT: **180 ms**; CLS: **0**.

Após essa medição, foi acrescentado preload responsivo **somente no HTML da página inicial**, com HTML separado para as demais rotas, e removido um nome acessível redundante. As notas acima são a medição registrada antes desse ajuste; não se presume melhora numérica sem nova auditoria.

O Lighthouse salvou o JSON, mas encerrou com erro EPERM ao limpar sua pasta temporária no Windows. O relatório contém métricas completas. Não é um resultado de campo em rede 4G real. Repetir no domínio definitivo com backend e configurações concluídas.

JavaScript inicial: aproximadamente **87,4 kB gzip**; CSS: **4,2 kB gzip**. Painel: chunk separado de aproximadamente **59,2 kB gzip**, não carregado na página inicial. Fonte condensada hospedada localmente. WebP responsivo; apenas hero eager. Nenhuma fotografia original JPG é servida pelo frontend.

### Auditoria final no Netlify — 12/09/2026

`lighthouse-netlify-final.json`: performance **82**, acessibilidade **100**, boas práticas **100**, SEO **100**; LCP **1,9 s**, TBT **660 ms**, CLS **0**. O bloqueio de processamento ainda oferece margem de otimização em celulares modestos. A primeira medição remota, executada junto com a suíte de navegador, marcou 60 e está preservada em `lighthouse-netlify.json`; a medição final foi feita sem essa concorrência. Não são medições de campo em aparelhos físicos. O Lighthouse salvou os relatórios completos e depois emitiu EPERM ao remover sua pasta temporária no Windows.

## Pendências de homologação remota

Faltam definição da senha pessoal por Diego, ajustes de recuperação/remetente no Auth, Pix real, conta Google e acesso à agenda. Conferir privacidade/retenção com o responsável e realizar um pagamento de homologação coordenado, sem automação bancária. A proteção por telefone normalizado funciona independentemente do cabeçalho IP; a política de encaminhamento de IP do gateway deve continuar sendo monitorada.

## Conferência após publicação
A publicação inicial foi verificada sem backend. A atualização conecta a API real descrita abaixo; não usa fixtures de teste no site.

## Homologação real Supabase — 11/09/2026

Projeto `iumnzmiebrykwyttdqmu`, plano gratuito, região São Paulo. Migrations e função publicadas e verificadas.

Doze verificações HTTP aprovadas: 19 horários oficiais; janela de 24h a sete dias; concorrência real 201/409; reserva sem convidado com preço R$ 135 e Pix nulo; idempotência; bloqueio imediato; outro professor no mesmo horário com convidado; recibo protegido por token; tabelas pessoais/administrativas inacessíveis com chave pública; Vault inacessível com chave pública; painel sem token retorna 401; telefone inválido rejeitado.

Adicionalmente, `expires_at` das duas reservas técnicas foi antecipado no banco para testar o vencimento sem aguardar 30 minutos: ambas apareceram livres antes de executar limpeza. O cron real atualizou ambos os status para `expired`; chamadas periódicas retornaram HTTP 200. Os dois registros técnicos e seus logs foram removidos após a conferência. Nenhum pagamento ou mensagem foi enviado.

Advisors: nota informativa de RLS sem política em `private.rate_limits` é intencional, pois somente service_role acessa. Dois índices de chaves estrangeiras foram adicionados e a extensão pg_net foi retirada do schema público. Após criar a conta Auth, restou a recomendação de proteção contra senhas vazadas; ela requer plano Pro e não foi ativada. Referências: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy e https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Em 12/09/2026, a conta Auth de Diego foi provisionada após autorização explícita. Seis verificações reais passaram: criação da conta, login Auth, JWT autorizado no painel, confirmação de pagamento, cancelamento e liberação da vaga. Uma senha aleatória existiu somente na memória do servidor durante o teste; sessões técnicas foram encerradas e a reserva técnica removida. O provisionamento temporário foi retirado do endpoint após uso. O acesso de uso único entregue ao proprietário não foi consumido por testes.

O teste real não prova a integração Google, ainda desativada. A duração de 30 minutos é validada automaticamente; o teste remoto de expiração utilizou vencimento antecipado controlado. O fluxo público completo também foi conferido no navegador Netlify com reserva real identificada e removida depois.

