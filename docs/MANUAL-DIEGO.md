# Manual do Diego

## Entrar

Abra `/admin` no domínio do site. Use o e-mail e a senha do usuário autorizado no Supabase. Não existe cadastro público. No celular, o painel apresenta as reservas em blocos, com botões grandes. Ao terminar em um aparelho compartilhado, toque em **Sair do painel**.

No primeiro acesso ou após recuperação, use o link enviado pelo administrador do projeto com destino `/admin?definir-senha=1` e defina uma senha exclusiva de pelo menos 12 caracteres. Para recuperar acesso depois, informe seu e-mail na tela de login e toque em **Esqueci minha senha**. O envio depende da configuração de e-mail do Supabase; o responsável técnico deve validar o remetente/SMTP e as URLs de redirecionamento. Definir uma senha não concede acesso: seu UUID também deve estar autorizado em `admin_users`.

## Conferir e confirmar pagamento

1. Abra **Reservas** e selecione **Aguardando pagamento**.
2. Confira código, aluno, professor, modalidade, data, WhatsApp, convidado e valor.
3. Use **WhatsApp do aluno** para abrir a conversa. O site não envia mensagens sozinho.
4. Confira o recebimento do Pix no seu banco. Um comprovante enviado pelo aluno, sozinho, não garante recebimento.
5. Toque em **Confirmar pagamento** e confirme a conferência. A operação fica auditada com seu usuário e data.

A reserva só pode ser confirmada antes do vencimento de 30 minutos. Vencida, o horário volta à disponibilidade e o aluno precisa criar outra solicitação. Não há confirmação bancária automática.

## Cancelar / liberar imediatamente

Na reserva ativa, toque em **Cancelar e liberar horário**. Isso libera aquela ocorrência, respeitando eventuais bloqueios administrativos. Um horário de mensalista continua bloqueado na grade até você liberar uma exceção.

## Mensalista faltou amanhã

1. Abra **Grade**.
2. Localize o professor e o horário recorrente bloqueado.
3. Toque em **Liberar somente nesta data**.
4. Informe a data de amanhã e confirme a hora.
5. Salve a exceção.

Aquela data ficará liberada, mas as semanas seguintes continuarão bloqueadas. A regra de 24 horas continua valendo: liberar amanhã às 7h depois das 7h de hoje não permite uma nova reserva pelo site para aquele horário.

## Grade semanal

Em **Grade**, selecione professor, dia da semana e hora cheia. Escolha:

- **Criar / liberar horário recorrente**: passa a estar disponível todas as semanas.
- **Bloquear horário recorrente (mensalista)**: bloqueia toda semana.
- **Desativar horário na grade**: retira o horário semanal.

Alterações da grade não cancelam reservas já confirmadas. Para isso, cancele a reserva explicitamente e avise o aluno.

## Uma data específica / horário extra

Em **Exceções**, escolha professor, data e hora. **Liberar somente nesta data / criar horário extra** cria uma disponibilidade pontual, inclusive fora da grade semanal. **Bloquear somente nesta data** impede novas reservas naquela ocorrência. Um horário já reservado continua ocupado até ser cancelado.

## Preço e Pix

Em **Configurações**, informe valor em reais, chave Pix, tipo e nome do titular. Copie os dados diretamente do banco para evitar erros. O preço novo vale apenas para novas reservas: as anteriores preservam seu valor. Sem chave, o aluno verá **Chave Pix ainda não configurada** depois de reservar.

## Histórico e Calendar

**Auditoria** mostra quando e por quem alterações foram feitas. Operações automáticas aparecem como sistema. A fila Calendar indica itens ainda aguardando sincronização; integração desativada ou falha do Google não elimina reservas.

O painel recebe mudanças em tempo real e também consulta a cada cinco segundos. Exibe até 500 reservas recentes; o histórico completo permanece no banco. Para análise de períodos extensos, solicite uma consulta administrativa ao responsável técnico.

## Depois da aula

A manutenção encerra a aula após seu término. A reserva ocupa somente aquela data; não bloqueia a semana seguinte. Para um aluno que passa a ser mensalista, registre o bloqueio recorrente separadamente.
