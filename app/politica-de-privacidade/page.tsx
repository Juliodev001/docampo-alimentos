import Link from 'next/link'

const NAVY = '#2d3561'
const GREEN = '#5ab952'

export const metadata = { title: 'Política de Privacidade – do campo Alimentos' }

export default function PoliticaPrivacidadePage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f8', padding: '40px 16px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${GREEN}, #4aa344)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
              🍓
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: 14, fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>
                <span style={{ color: '#e8255a', fontWeight: 700 }}>do campo</span>
                <span style={{ color: GREEN, fontWeight: 700 }}> Alimentos</span>
              </p>
              <p style={{ margin: 0, fontSize: 10, color: '#9ca3af', letterSpacing: 1 }}>GESTÃO INTELIGENTE</p>
            </div>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: NAVY, margin: 0 }}>Política de Privacidade</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 8 }}>Última atualização: maio de 2026</p>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: 16, padding: 40, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', lineHeight: 1.75, color: '#374151', fontSize: 15 }}>

          <Section title="1. Quem somos">
            <p>
              <strong>do campo Alimentos</strong> é responsável pelo tratamento dos dados pessoais coletados
              neste sistema de gestão agrícola. Para dúvidas ou solicitações relacionadas à privacidade,
              entre em contato pelo WhatsApp ou e-mail indicados no final desta política.
            </p>
          </Section>

          <Section title="2. Dados que coletamos">
            <p>Coletamos apenas os dados estritamente necessários para o funcionamento do sistema:</p>
            <Table rows={[
              ['Categoria', 'Dados coletados'],
              ['Produtores', 'Nome completo, CPF/CNPJ, telefone'],
              ['Parceiros de produtores', 'Nome completo, CPF/CNPJ, percentual de participação'],
              ['Clientes', 'Nome/razão social, CNPJ/CPF, telefone, e-mail'],
              ['Fornecedores', 'Nome/razão social, CNPJ/CPF, telefone, e-mail'],
              ['Usuários do sistema', 'Nome, e-mail, senha (armazenada em hash irreversível)'],
              ['Dados operacionais', 'Registros de colheita, pagamentos, notas fiscais, compras e vendas (vinculados a produtores e clientes)'],
            ]} />
          </Section>

          <Section title="3. Finalidade e base legal">
            <Table rows={[
              ['Finalidade', 'Base legal (LGPD, art. 7º)'],
              ['Cadastro e gestão de produtores e clientes', 'Execução de contrato (inciso V)'],
              ['Emissão de documentos fiscais (NF-e)', 'Cumprimento de obrigação legal (inciso II)'],
              ['Cálculo de pagamentos e relatórios', 'Execução de contrato (inciso V)'],
              ['Envio de mensagens via WhatsApp', 'Legítimo interesse — comunicação comercial já existente (inciso IX)'],
              ['Controle de acesso ao sistema', 'Execução de contrato (inciso V)'],
            ]} />
          </Section>

          <Section title="4. Compartilhamento de dados">
            <p>
              Os dados <strong>não são vendidos, alugados ou compartilhados</strong> com terceiros para fins
              comerciais. Podemos compartilhar dados com:
            </p>
            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
              <li>Autoridades fiscais, quando exigido por lei (SEFAZ, Receita Federal);</li>
              <li>Prestadores de serviço tecnológico que hospedam o sistema (Hostinger), sob contrato de confidencialidade.</li>
            </ul>
          </Section>

          <Section title="5. Retenção dos dados">
            <Table rows={[
              ['Tipo de dado', 'Prazo de retenção'],
              ['Dados de produtores e clientes ativos', 'Enquanto a relação comercial estiver ativa'],
              ['Documentos fiscais (NF-e, compras)', '5 anos (obrigação legal tributária)'],
              ['Dados de usuários desativados', '6 meses após desativação'],
              ['Registros de colheita e pagamento', '5 anos (obrigação fiscal)'],
            ]} />
          </Section>

          <Section title="6. Seus direitos como titular">
            <p>Nos termos da LGPD (art. 18), você tem direito a:</p>
            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
              <li><strong>Confirmação e acesso</strong> — saber se tratamos seus dados e obter uma cópia;</li>
              <li><strong>Correção</strong> — solicitar atualização de dados incorretos ou desatualizados;</li>
              <li><strong>Eliminação</strong> — pedir a exclusão dos dados, exceto quando há obrigação legal de guarda;</li>
              <li><strong>Portabilidade</strong> — receber seus dados em formato estruturado (JSON);</li>
              <li><strong>Informação sobre compartilhamento</strong> — saber com quem compartilhamos seus dados;</li>
              <li><strong>Revogação do consentimento</strong> — quando o tratamento for baseado em consentimento.</li>
            </ul>
            <p style={{ marginTop: 12 }}>
              Para exercer qualquer desses direitos, entre em contato pelo canal abaixo. Responderemos em até <strong>15 dias úteis</strong>.
            </p>
          </Section>

          <Section title="7. Segurança dos dados">
            <p>Adotamos as seguintes medidas técnicas para proteger seus dados:</p>
            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
              <li>Acesso ao sistema restrito por autenticação com senha;</li>
              <li>Senhas armazenadas com hash criptográfico (bcrypt);</li>
              <li>Comunicação via HTTPS (TLS);</li>
              <li>Controle de perfis de acesso por nível de permissão;</li>
              <li>Backups periódicos do banco de dados.</li>
            </ul>
          </Section>

          <Section title="8. Encarregado (DPO) e contato">
            <p>
              Por tratar-se de empresa de pequeno porte, a indicação formal de Encarregado (DPO) é facultativa
              conforme resolução da ANPD. Ainda assim, disponibilizamos canal direto para solicitações de
              titulares:
            </p>
            <div style={{ backgroundColor: '#f9fafb', borderRadius: 10, padding: '16px 20px', marginTop: 12, border: `1px solid ${GREEN}30` }}>
              <p style={{ margin: 0, fontWeight: 600, color: NAVY }}>do campo Alimentos</p>
              <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
                Entre em contato pelo WhatsApp ou pelo administrador do sistema para exercer seus direitos como titular de dados.
              </p>
            </div>
          </Section>

          <Section title="9. Alterações nesta política">
            <p>
              Esta política pode ser atualizada periodicamente. A data de última revisão está indicada no
              topo do documento. Recomendamos consultar esta página regularmente.
            </p>
          </Section>

        </div>

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link href="/login" style={{ color: GREEN, fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>
            ← Voltar para o login
          </Link>
        </div>

      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: NAVY, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #f3f4f6' }}>{title}</h2>
      {children}
    </div>
  )
}

function Table({ rows }: { rows: string[][] }) {
  return (
    <div style={{ overflowX: 'auto', marginTop: 8 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ backgroundColor: '#f9fafb' }}>
            {rows[0].map((h, i) => (
              <th key={i} style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600, color: NAVY, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '9px 14px', color: '#374151' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
