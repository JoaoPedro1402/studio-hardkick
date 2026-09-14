# Pendências e condições de ativação

## Integrações

- **Supabase:** projeto gratuito `iumnzmiebrykwyttdqmu` ativo, migrations/RLS aplicadas, função publicada, Vault e cron funcionando. A conta Auth de `diegohardkick@gmail.com` foi criada e é a única autorizada em `admin_users`. Login e operações administrativas foram testados na API real. Diego deve definir sua senha pessoal pelo acesso inicial reservado. Revisar no Dashboard a desativação de novos cadastros Auth, URLs de recuperação e remetente/SMTP. A criação pública de um usuário Auth não concede nenhuma permissão administrativa.
- **GitHub:** projeto oficial conectado; a branch `main` dispara publicação automática na Cloudflare.
- **Cloudflare:** produção em https://studio-hardkick.joaopedrocoelhosilva14.workers.dev. Manter as três variáveis públicas VITE no ambiente de build. CORS do Supabase atualizado para essa origem; conferir Site URL e Redirect URLs no Auth remoto.
- **Google:** projeto/API, conta de serviço, compartilhamento, Calendar ID e chave privada não fornecidos. Adaptador pronto e testes isolados passaram; nenhuma chamada autenticada à agenda real foi validada.
- **Sentry:** etapa posterior à homologação do backend; não há token/projeto fornecido nem coleta ativa.

## Dados do cliente não inventados

- Chave Pix definitiva, tipo e nome do titular.
- Fotografia individual confirmada de Tim Leite.
- Formação detalhada e tempo exato de experiência de Mike e Tim.
- Logomarca vetorial definitiva: recebido somente JPG de 157 × 199 pixels. A versão web preserva esse material e não inventa uma marca vetorial.
- Acesso ao domínio oficial.
- Definição operacional de retenção de dados para a política de privacidade.

## Limites atuais

O backend já aceita reservas reais e retorna a grade oficial. A chave Pix está ausente e isso aparece explicitamente no recibo. Sem Google configurado, reservas válidas no banco continuam funcionando; a fila permanece pendente e não há promessa de sincronização concluída.

Não declarar a operação comercial pronta até Diego definir sua senha e configurar o Pix. A integração Google real permanece pendente. Testes físicos em Android/iPhone e homologação de pagamento devem ser coordenados com o responsável.

O advisor recomenda proteção contra senhas vazadas, disponível apenas no plano Pro ou superior. Não foi ativada, respeitando a proibição de contratar recursos pagos. O formulário exige senha de pelo menos 12 caracteres. Fonte: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
