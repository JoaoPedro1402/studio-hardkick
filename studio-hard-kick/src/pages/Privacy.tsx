export default function Privacy() {
  return (
    <article className="page prose">
      <h1>
        Política de
        <br />
        <em>privacidade.</em>
      </h1>
      <p>
        O Studio Hard Kick utiliza os dados informados para organizar sua aula e
        atender sua solicitação. Versão de 11 de setembro de 2026.
      </p>
      <h2>Dados e finalidade</h2>
      <p>
        Coletamos nome, WhatsApp, modalidade, professor, horário, consentimento
        e, quando houver, nome do convidado. Informe dados de um convidado
        somente com a autorização dele. Utilizamos essas informações para
        reservar a aula, conferir o pagamento manualmente e entrar em contato
        sobre o agendamento.
      </p>
      <h2>Armazenamento e acesso</h2>
      <p>
        As reservas ficam em banco protegido no Supabase, acessível à
        administração autorizada. Se a integração estiver ativada, os dados da
        reserva também ficam na agenda dedicada do Google Calendar. Esses
        fornecedores podem processar dados fora do Brasil. O site é hospedado no
        Netlify. Não vendemos seus dados e não utilizamos suas informações para
        publicidade sem autorização específica.
      </p>
      <h2>WhatsApp e pagamento</h2>
      <p>
        Os botões de WhatsApp abrem um serviço externo. O envio da mensagem e do
        comprovante depende de sua ação. O site não verifica transações
        bancárias automaticamente e não armazena comprovantes de pagamento.
      </p>
      <h2>Retenção e seus direitos</h2>
      <p>
        Os dados devem ser conservados somente pelo tempo necessário ao
        atendimento, à prestação de contas e às obrigações aplicáveis. Você pode
        solicitar acesso, correção, revogação do consentimento ou exclusão pelo
        WhatsApp oficial +55 12 99790-7760 ou pelo e-mail
        diegohardkick@gmail.com. A exclusão poderá observar obrigações de
        conservação aplicáveis.
      </p>
      <h2>Segurança e serviços externos</h2>
      <p>
        O agendamento utiliza limites de requisição para prevenir abuso. O
        painel usa armazenamento de sessão para autenticação. O mapa integrado
        se conecta ao Google. Não há cookies de publicidade instalados por esta
        aplicação.
      </p>
    </article>
  );
}
