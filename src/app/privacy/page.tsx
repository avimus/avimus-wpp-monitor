export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Política de Privacidade
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Avimus WPP Monitor — Última atualização: 30/05/2026
        </p>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">
              1. Dados coletados
            </h2>
            <p>
              Coletamos as seguintes informações dos contratantes: nome completo,
              endereço de e-mail e dados de autenticação. Também registramos logs
              de status das instâncias WhatsApp (histórico de conexão e
              desconexão) para fins de monitoramento e diagnóstico.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">
              2. Retenção de dados
            </h2>
            <p>
              Os logs de status são retidos por no máximo <strong>90 dias</strong>,
              após os quais são excluídos automaticamente. Dados de conta
              (nome e e-mail) são mantidos enquanto a conta estiver ativa.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">
              3. Direito de exclusão (LGPD)
            </h2>
            <p>
              Em conformidade com a Lei Geral de Proteção de Dados (Lei nº
              13.709/2018), você tem o direito de solicitar a exclusão de todos
              os seus dados pessoais. Entre em contato com o administrador da
              plataforma para exercer este direito. A exclusão da conta remove
              todos os dados pessoais e histórico associados.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">
              4. Segurança
            </h2>
            <p>
              Seus dados são armazenados de forma segura com isolamento por
              tenant. Cada contratante acessa exclusivamente seus próprios dados.
              As credenciais de autenticação são gerenciadas pelo Supabase Auth
              com criptografia em repouso e em trânsito.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">5. Contato</h2>
            <p>
              Para dúvidas sobre privacidade ou para exercer seus direitos sob
              a LGPD, entre em contato com o administrador da plataforma.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
