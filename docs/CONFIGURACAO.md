# Configuração e publicação

## Supabase

1. Projeto dedicado criado e ativo: `studio-hardkick`, referência `iumnzmiebrykwyttdqmu`, região São Paulo, organização `uiaemxvnedbsficnhuwv`. Plano Free e custo mensal de criação confirmado em zero. O projeto genérico anterior não foi alterado.
2. Confirme o plano gratuito e a disponibilidade de quotas no painel. Não crie recursos pagos nem branches pagos para este procedimento.
3. As migrations já foram aplicadas pelo conector. Os nomes locais foram alinhados às versões registradas no banco. Para atualizações, consulte `supabase --help`, autentique e vincule: `supabase link --project-ref iumnzmiebrykwyttdqmu`. Revise `supabase migration list` antes de `supabase db push`. Não reaplique o schema inicial manualmente.
4. Desative **Allow new users to sign up** em Authentication. O `supabase/config.toml` também define `enable_signup=false`, mas revise a configuração remota: somente enviar migrations não altera o Auth remoto.
5. A conta de Diego já está criada e autorizada: `00263294-fbe7-4981-85c4-9b088c904acf`, e-mail `diegohardkick@gmail.com`. Uma senha aleatória temporária foi utilizada apenas dentro do servidor para testar o login; não foi retornada, salva no código ou enviada por mensagem. As sessões técnicas foram encerradas. Diego deve definir a senha pelo link inicial reservado ou por recuperação. Para outra instalação, crie o usuário no Auth e autorize o UUID:

```sql
insert into public.admin_users(user_id) values ('UUID_DO_USUARIO_AUTH');
```

A autorização usa essa tabela e `getUser()`, nunca metadados editáveis do usuário. Configure URLs de redirecionamento do Auth para `https://studio-hardkick.joaopedrocoelhosilva14.workers.dev/admin?definir-senha=1` e, posteriormente, o domínio definitivo. O acesso inicial pode usar `token_hash` de recuperação verificado pelo Supabase; o frontend remove esse token da URL antes de mostrar o formulário. Configure remetente/SMTP para recuperação por e-mail de forma confiável, conforme o provedor disponível, sem contratar serviço pago automaticamente.

6. Nas **Edge Function Secrets**, configure os segredos listados abaixo. `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` normalmente já são fornecidos pelo ambiente Supabase; não copie a service role para Cloudflare nem para o frontend.
7. Publique a função: `supabase functions deploy hardkick`. O `verify_jwt=false` é intencional: o mesmo endpoint permite consultar slots anonimamente, enquanto ações administrativas verificam o token com `auth.getUser()` e consultam a lista autorizada. Cron valida seu próprio segredo. RPCs de banco são executáveis somente por `service_role`.
8. Execute os advisors de segurança do Supabase e valide acesso com papéis anon/authenticated. Confirme que nenhuma tabela de reservas é pública.

### Segredos de servidor

| Nome | Destino e finalidade |
|---|---|
| `SUPABASE_URL` | Ambiente Supabase; URL do projeto |
| `SUPABASE_SERVICE_ROLE_KEY` | Somente Supabase; operações de servidor |
| `ALLOWED_ORIGINS` | Lista separada por vírgula dos domínios exatos do frontend, incluindo preview autorizado |
| `RATE_LIMIT_SECRET` | Valor aleatório de pelo menos 32 caracteres; HMAC de limites e tokens de recibo |
| `CRON_SECRET` | Outro valor aleatório de pelo menos 32 caracteres; manutenção |
| `PIX_KEY`, `PIX_KEY_TYPE`, `PIX_HOLDER` | Fallback inicial opcional; preferir configurar pelo painel do Diego |
| `GOOGLE_CALENDAR_ENABLED` | `false` até completar e testar a configuração Google |
| `GOOGLE_CALENDAR_ID` | ID da agenda dedicada |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Conta de serviço com acesso somente à agenda |
| `GOOGLE_PRIVATE_KEY` | Chave privada PEM; aceita quebras de linha reais ou `\n` |

Não rotacione `RATE_LIMIT_SECRET` durante reservas pendentes sem planejamento: a idempotência de repetição depende dele. Tokens existentes já entregues continuam verificáveis por hash, mas uma repetição antiga da criação não produzirá o mesmo token após rotação.

### Cron

O Vault já contém os segredos de HMAC e cron gerados aleatoriamente no servidor, além das origens e URL. A função usa variáveis de ambiente quando presentes; senão consulta `hk_runtime_config`, RPC `SECURITY INVOKER` executável somente por service_role. Anon e authenticated não podem ler esse RPC nem o Vault. O cache de servidor dura 60 segundos. Nenhum segredo foi salvo no código-fonte.

Para uma nova instalação, configure no Vault antes de executar a migration de cron:

- `hardkick_maintenance_url`: `https://REFERENCIA.supabase.co/functions/v1/hardkick`
- `hardkick_cron_secret`: gerado pela migration de Vault; se definir `CRON_SECRET`, mantenha os dois iguais.
- `hardkick_rate_limit_secret`: gerado pela migration; fallback de `RATE_LIMIT_SECRET`.
- `hardkick_allowed_origins`: lista separada por vírgulas; incluir `https://studio-hardkick.joaopedrocoelhosilva14.workers.dev`. A origem Cloudflare foi adicionada ao Vault em 14/09/2026, preservando as origens anteriores. Remova origens locais após homologação e adicione somente previews autorizados.

A migration de cron já está aplicada e as chamadas retornaram HTTP 200. O job roda a cada minuto, expira reservas, conclui aulas terminadas e processa a fila Calendar quando habilitada. `supabase/ops/schedule.sql` permite recriar o agendamento com o mesmo nome. Verifique `cron.job_run_details` sem registrar payloads pessoais. A reserva vencida já aparece livre mesmo se o job estiver atrasado, confirmado no banco real.

## Frontend / Cloudflare Workers

O projeto oficial está conectado ao GitHub e publica automaticamente a branch `main`. O arquivo `wrangler.jsonc` aponta para `dist` e mantém o fallback SPA.

Configure no ambiente de **build** da Cloudflare:

- `VITE_SUPABASE_URL`: URL pública do mesmo projeto Supabase existente.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: chave pública publishable desse projeto, nunca service role.
- `VITE_SITE_URL`: `https://studio-hardkick.joaopedrocoelhosilva14.workers.dev`.

Use Node 24, instalação `npm ci` e build `npm run build`. As variáveis VITE são incorporadas durante o build: alterar apenas variáveis de runtime não recompila o frontend. `netlify.toml` permanece como configuração legada, não é utilizado pela Cloudflare.

## Supabase ao trocar a origem

A Edge Function usa `ALLOWED_ORIGINS` quando definido; caso contrário, usa `hardkick_allowed_origins` do Vault, com cache de 60 segundos. Inclua a origem HTTPS exata da Cloudflare na configuração efetiva. Não altere URL/chave do projeto, segredos HMAC/cron, RLS ou migrations para trocar o endereço do frontend.

No Auth remoto, configure **Site URL** como `https://studio-hardkick.joaopedrocoelhosilva14.workers.dev` e autorize `https://studio-hardkick.joaopedrocoelhosilva14.workers.dev/admin?definir-senha=1` em **Redirect URLs**. A tela já usa `window.location.origin` para recuperação. Esta configuração do Dashboard é independente do Git e precisa ser conferida; o conector SQL não administra as configurações do Auth. Referência: [URLs de redirecionamento do Supabase](https://supabase.com/docs/guides/auth/redirect-urls).

## GitHub e deploy contínuo

Antes de enviar a `main`, execute `npm test`, `npm run test:e2e` e `npm run build`. O push dispara o deploy conectado à Cloudflare. Após publicar, confira as rotas, metadados e consulta pública de horários. Não há workflow de validação GitHub versionado nesta revisão.

## Domínio futuro

Ao adicionar um domínio próprio na Cloudflare, atualize `VITE_SITE_URL`, canonical/OG em `index.html`, `scripts/seo.mjs`, `src/main.tsx`, JSON-LD em `src/pages/Home.tsx`, sitemap e robots. Atualize também CORS e URLs do Auth no Supabase antes de direcionar usuários ao novo domínio.
