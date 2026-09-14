# Publicação e entrega

- Produção: https://studio-hardkick.joaopedrocoelhosilva14.workers.dev
- Painel: https://studio-hardkick.joaopedrocoelhosilva14.workers.dev/admin
- Supabase: `studio-hardkick`, referência `iumnzmiebrykwyttdqmu`, São Paulo, plano Free com custo de criação confirmado em zero.

O projeto oficial está conectado ao GitHub e publica automaticamente a branch `main` na Cloudflare Workers. A configuração de assets está em `wrangler.jsonc`.

## Histórico de homologação do backend (11–12/09/2026)

Frontend e Edge Function conectados ao banco real. Grade oficial, disponibilidade, reserva atômica, recibo protegido, concorrência 201/409, expiração sem cron e rotina periódica testados. No navegador da prévia, o formulário criou uma reserva técnica, mostrou contador, aviso de Pix ausente e link correto de comprovante. O registro técnico foi removido. Console sem erros nessa conferência.

A conta Auth de Diego está criada e é a única autorizada. Login real, JWT, confirmação, cancelamento e liberação foram testados com uma senha aleatória mantida somente na memória do servidor. As sessões técnicas foram encerradas. Diego deve definir sua senha pelo acesso inicial reservado, entregue separadamente do ZIP. O provisionamento temporário foi removido da função pública após uso.

As cinco migrations locais correspondem às versões do Supabase. RLS protege dados pessoais, operações de banco exigem chave de servidor e o cron responde HTTP 200. Nenhuma credencial administrativa está no frontend.

## Configurações ainda necessárias

1. Diego definir a senha e informar chave Pix, tipo e titular no painel.
2. Configurar credenciais Google/Calendar conforme GOOGLE-CALENDAR.md. Adaptador implementado; sincronização real desativada.
3. Validar URLs de recuperação e remetente/SMTP do Supabase. Desativar novos cadastros Auth no Dashboard; contas fora de admin_users não têm acesso ao painel ou dados.
4. Definir domínio oficial, retenção de dados e homologar aparelhos físicos.

Sentry permanece para monitoramento posterior, sem credenciais fornecidas ou coleta ativa. Proteção adicional de senhas vazadas exige Supabase Pro e não foi contratada. Essas limitações não são apresentadas como integrações concluídas.

## Código e atualizações

O repositório GitHub é a fonte oficial. Execute testes e build antes de enviar a `main`; o push aciona a publicação Cloudflare. Consulte CONFIGURACAO.md e ARQUITETURA.md. Os relatórios Lighthouse do Netlify foram preservados como evidência histórica e não representam medições da Cloudflare.
