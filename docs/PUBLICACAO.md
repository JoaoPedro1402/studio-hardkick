# Publicação e entrega

- Prévia: https://studiohardkick.netlify.app
- Versão fixa: https://6aa576009a24fc40bb756638--studiohardkick.netlify.app
- Painel: https://studiohardkick.netlify.app/admin
- Supabase: `studio-hardkick`, referência `iumnzmiebrykwyttdqmu`, São Paulo, plano Free com custo de criação confirmado em zero.

Netlify confirmou `ready` em 12/09/2026 às 15:56:00 UTC. Publicação direta do código no projeto existente, contexto da plataforma **production**, utilizada como prévia de homologação. GitHub foi dispensado pelo usuário. Nenhum recurso pago foi contratado.

## Funcionamento verificado

Frontend e Edge Function conectados ao banco real. Grade oficial, disponibilidade, reserva atômica, recibo protegido, concorrência 201/409, expiração sem cron e rotina periódica testados. No navegador da prévia, o formulário criou uma reserva técnica, mostrou contador, aviso de Pix ausente e link correto de comprovante. O registro técnico foi removido. Console sem erros nessa conferência.

A conta Auth de Diego está criada e é a única autorizada. Login real, JWT, confirmação, cancelamento e liberação foram testados com uma senha aleatória mantida somente na memória do servidor. As sessões técnicas foram encerradas. Diego deve definir sua senha pelo acesso inicial reservado, entregue separadamente do ZIP. O provisionamento temporário foi removido da função pública após uso.

As cinco migrations locais correspondem às versões do Supabase. RLS protege dados pessoais, operações de banco exigem chave de servidor e o cron responde HTTP 200. Nenhuma credencial administrativa está no frontend.

## Configurações ainda necessárias

1. Diego definir a senha e informar chave Pix, tipo e titular no painel.
2. Configurar credenciais Google/Calendar conforme GOOGLE-CALENDAR.md. Adaptador implementado; sincronização real desativada.
3. Validar URLs de recuperação e remetente/SMTP do Supabase. Desativar novos cadastros Auth no Dashboard; contas fora de admin_users não têm acesso ao painel ou dados.
4. Definir domínio oficial, retenção de dados e homologar aparelhos físicos.

Sentry permanece para monitoramento posterior, sem credenciais fornecidas ou coleta ativa. Proteção adicional de senhas vazadas exige Supabase Pro e não foi contratada. Essas limitações não são apresentadas como integrações concluídas.

## Pacote

studio-hard-kick-producao.zip contém React/TypeScript, imagens oficiais otimizadas, migrations, RLS, Edge Function, adaptador Calendar, testes, .env.example, configuração Netlify e manuais. Exclui node_modules, diretório Git, arquivos .env preenchidos e credenciais de acesso.

O histórico Git local está preservado. Para atualizar, siga CONFIGURACAO.md e ARQUITETURA.md. Publicação direta no Netlify não exige repositório remoto.
