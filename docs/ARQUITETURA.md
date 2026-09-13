# Arquitetura e manutenção

## Componentes e limites de confiança

Navegador → Edge Function `hardkick` → PostgreSQL. Para ações administrativas, a função verifica o JWT no Auth e exige registro em `admin_users`. Chave publishable no navegador é pública por desenho. Service role permanece no servidor. Tabelas não têm concessão anônima. RLS permite somente leitura por administradores autenticados; escritas passam pelas operações controladas do servidor.

Consulta pública retorna apenas instantes livres, professor e preço. Dados pessoais de um recibo exigem ID e token de acesso opaco. O token não é registrado no banco em texto puro: apenas SHA-256. Nome/WhatsApp não aparecem na URL do site; a mensagem para WhatsApp só é aberta pelo usuário.

## Concorrência

`hk_reserve` adquire advisory lock transacional por professor. Alterações de grade usam o mesmo lock. O índice único parcial em `(professor_id, starts_at)` é a segunda garantia contra duas reservas ativas. Antes da inserção, pendências vencidas daquela ocorrência viram `expired`. A consulta de disponibilidade desconsidera `expires_at <= now()` imediatamente.

A chave idempotente identifica uma solicitação. Repetir com o mesmo conteúdo retorna a mesma reserva, sem estender o prazo. Reutilizar a chave com conteúdo diferente falha. O preço é copiado da configuração na transação. Status são validados em trigger, inclusive vencimento e conclusão antes do fim da aula.

## Segurança operacional

Mantenha acesso ao projeto, Auth e agenda restritos. Desative cadastros públicos no Supabase remoto. Não crie administradores por metadados de usuário. Não registre payloads de reservas nos logs. O rate limit é persistente e usa hashes HMAC de telefone/IP; o cabeçalho de IP depende do gateway Supabase e precisa ser verificado na homologação do ambiente remoto. Honeypot e limite não substituem monitoramento de abuso. CAPTCHA oficial pode ser incorporado se necessário, sem ativar serviços pagos automaticamente.

## Rotina de manutenção

- Verificar falhas de cron, fila Calendar e avisos de segurança do Supabase.
- Verificar orçamento/quotas nos painéis, sem upgrades automáticos.
- Atualizar dependências de forma controlada, preservar lockfile e executar `npm test`, `npm run test:e2e`, `npm run build` e `deno check`.
- Criar nova migration para qualquer alteração de schema já publicada; nunca editar uma migration aplicada.
- Antes de atualizações de banco, confirmar export/backup disponível no plano e testar restauração. Não há contratação de backup pago incluída nesta entrega.
- Definir formalmente com o responsável o prazo de retenção de dados. Até essa definição, não executar exclusões automáticas de reservas. Atender pedidos LGPD por procedimento administrativo, mantendo somente o necessário às obrigações aplicáveis.
- Atualizar documentação ao trocar domínio, Pix ou credenciais.

## Sentry — etapa posterior

Não há coleta Sentry ativa nesta versão. O plugin disponível é de consulta de observabilidade e exige `SENTRY_AUTH_TOKEN`, organização e projeto existentes. Nenhum projeto/plano pago foi criado. Depois da homologação do backend, configure um projeto existente e um token somente de leitura (`project:read`, `event:read`, `org:read`) no ambiente local do responsável técnico, nunca no frontend nem no repositório. Use o plugin para examinar problemas de produção. Se adicionar SDK futuramente, use carregamento separado, remova PII em `beforeSend`, desative replay e captura de formulários e verifique a política de privacidade antes de ativar a coleta.

## Melhorias não ativadas

Notificações automáticas por WhatsApp exigiriam integração oficial Meta WhatsApp Business API e avaliação de custos. O sistema atual usa links de conversa e Calendar, sem automação não oficial. Não há checkout, boleto, cartão nem gateway de pagamento.
