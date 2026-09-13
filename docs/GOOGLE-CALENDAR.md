# Google Calendar: configuração

A disponibilidade nasce no PostgreSQL. A aplicação **não lê eventos pessoais para bloquear horários**. A agenda Google é uma cópia operacional das reservas, com sincronização idempotente e recuperável.

## Preparar o Google Cloud

1. Entre no Google Cloud com a conta responsável. Crie ou selecione um projeto para esta integração. Não habilite faturamento, upgrades ou recursos pagos sem autorização do proprietário.
2. Em APIs & Services → Library, procure **Google Calendar API** e clique em Enable.
3. Em IAM & Admin → Service Accounts, crie uma conta de serviço, por exemplo `hardkick-calendar`. Não conceda papéis amplos de administrador/editor do projeto. A permissão necessária será concedida na própria agenda.
4. Na conta de serviço → Keys → Add key → Create new key → JSON. Guarde o arquivo fora do repositório, em local seguro. Nunca envie o JSON ao chat, frontend, GitHub ou Netlify.
5. Copie `client_email` para `GOOGLE_SERVICE_ACCOUNT_EMAIL` e o conteúdo de `private_key` para `GOOGLE_PRIVATE_KEY`, exclusivamente nos segredos das Edge Functions Supabase.

## Criar a agenda dedicada

1. No Google Calendar do Diego (`diegohardkick@gmail.com`), em Outras agendas → Criar nova agenda, crie **Agendamentos Hard Kick**.
2. Defina o fuso **America/Sao_Paulo**.
3. Em Configurações e compartilhamento, compartilhe somente essa agenda com o `client_email` da conta de serviço, permitindo **Fazer alterações nos eventos**. Não torne a agenda pública.
4. Se outra conta criar a agenda, compartilhe-a também com `diegohardkick@gmail.com`, permitindo que ele acompanhe os agendamentos. O uso mais simples é o próprio Diego criá-la.
5. Em Integrar agenda, copie **ID da agenda** (não o link público nem o endereço iCal) para `GOOGLE_CALENDAR_ID` nos segredos Supabase.
6. Defina `GOOGLE_CALENDAR_ENABLED=true` somente quando os três segredos anteriores estiverem corretos. Não há refresh token: o servidor assina JWTs de conta de serviço e obtém tokens temporários.

## Funcionamento implementado

- Inserção de reserva e item da fila ocorrem na mesma transação.
- Cada evento tem ID `hk` + UUID da reserva sem hífens; repetição não cria outro evento.
- Pendente: título **AGUARDANDO PAGAMENTO**, com código e professor. A descrição contém aluno, WhatsApp, modalidade, professor, convidado e vencimento.
- Confirmada: atualiza o mesmo evento para **CONFIRMADO**.
- Expirada/cancelada: exclui o evento; respostas 404/410 na exclusão contam como já removido.
- Concluída: atualiza o título para **CONCLUÍDA**.
- Falha: mantém a reserva e a fila, com nova tentativa progressiva de 30 segundos até uma hora. Nenhuma resposta externa é registrada com dados pessoais.
- Revisões impedem que uma tentativa antiga marque uma alteração posterior como sincronizada. Os workers reivindicam lotes pequenos com lease e token de posse.
- Cron processa pendências a cada minuto. A fila permanece pendente quando a integração está desativada.

## Homologação obrigatória depois de configurar

Em ambiente de teste, crie uma reserva identificada como teste, verifique o evento provisório e sua duração, confirme pelo painel e confira a atualização do mesmo ID. Cancele/expire e confira a exclusão. Revogue temporariamente o acesso à agenda e confirme que uma falha não remove a reserva. Restaure o acesso e execute a manutenção para confirmar a recuperação. Esses testes com a API Google real ainda dependem das credenciais.

## Diagnóstico

- `google_auth_failed`: conferir e-mail da conta, chave PEM e revogação da chave.
- `calendar_sync_failed`: conferir API habilitada, Calendar ID e compartilhamento.
- Fila sem progresso: conferir `GOOGLE_CALENDAR_ENABLED`, cron, Vault e `CRON_SECRET`.
- Não editar os eventos dedicados para alterar reservas: use o painel. O banco é a fonte principal e uma sincronização poderá sobrescrever alterações manuais.

Referências oficiais: [Service accounts / OAuth](https://developers.google.com/identity/protocols/oauth2/service-account), [criação de eventos e ID](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert), [Edge Function secrets](https://supabase.com/docs/guides/functions/secrets).
