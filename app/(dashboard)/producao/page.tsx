import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const ORANGE = '#e87320'

export default async function ProducaoPage() {
  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const inicioSemana = new Date(hoje)
  inicioSemana.setDate(hoje.getDate() - 7)

  const [colheitas, registros, produtos] = await Promise.all([
    prisma.colheitaDiaria.findMany({
      include: { produto: true, produtor: true },
      orderBy: { data: 'desc' },
      take: 10,
    }),
    prisma.registroProducao.findMany({
      include: { entradas: true, saidas: true },
      orderBy: { data: 'desc' },
      take: 6,
    }),
    prisma.produto.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } }),
  ])

  const colheitasMes = await prisma.colheitaDiaria.findMany({
    where: { data: { gte: inicioMes } },
  })
  const colheitasSemana = colheitas.filter(c => new Date(c.data) >= inicioSemana)

  const totalMes = colheitasMes.reduce((s, c) => s + c.quantidadeTotal, 0)
  const totalSemana = colheitasSemana.reduce((s, c) => s + c.quantidadeTotal, 0)
  const totalDescarte = colheitasMes.reduce((s, c) => s + c.descarte, 0)
  const valorMes = colheitasMes.reduce((s, c) => s + (c.quantidadeTotal - c.descarte) * c.preco, 0)

  const registrosPendentes = registros.filter(r => r.status === 'RASCUNHO').length

  const shortcut = (href: string, label: string, emoji: string, color: string) => (
    <Link
      href={href}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '18px 12px', backgroundColor: 'white', borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: `1px solid ${color}22`,
        textDecoration: 'none', transition: 'box-shadow 0.18s',
        flex: 1, minWidth: 110,
      }}
    >
      <span style={{ fontSize: 24 }}>{emoji}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: NAVY, textAlign: 'center' }}>{label}</span>
    </Link>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex-header">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: NAVY, margin: 0 }}>Produção</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
            Gestão de colheitas, registros e saídas da lavoura
          </p>
        </div>
        <Link
          href="/producao/registro/novo"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px',
            backgroundColor: GREEN, color: 'white', border: 'none', borderRadius: 10,
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}
        >
          + Novo Registro
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid-4">
        {[
          { label: 'Colhido este mês', value: `${totalMes.toFixed(0)} cx`, color: GREEN, sub: `${colheitasMes.length} registros` },
          { label: 'Últimos 7 dias', value: `${totalSemana.toFixed(0)} cx`, color: '#3b82f6', sub: `${colheitasSemana.length} colheitas` },
          { label: 'Descarte do mês', value: `${totalDescarte.toFixed(0)} cx`, color: ORANGE, sub: totalMes > 0 ? `${((totalDescarte / totalMes) * 100).toFixed(1)}% do total` : '0%' },
          { label: 'Valor da produção', value: formatCurrency(valorMes), color: '#7c3aed', sub: 'mês atual' },
        ].map(({ label, value, color, sub }, i) => (
          <div
            key={label}
            style={{
              backgroundColor: 'white', borderRadius: 14,
              padding: '18px 20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              borderTop: `4px solid ${color}`,
            }}
          >
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{label}</p>
            <p className="kpi-val" style={{ fontSize: 24, fontWeight: 800, color, margin: '0 0 2px', wordBreak: 'break-word' }}>{value}</p>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Atalhos */}
      <div style={{ backgroundColor: 'white', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 14px' }}>Acessar módulo</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {shortcut('/lavoura/colheita', 'Colheitas', '🌾', GREEN)}
          {shortcut('/lavoura/pagamento', 'Pagamentos', '💰', ORANGE)}
          {shortcut('/lavoura/saida', 'Saída', '📦', '#3b82f6')}
          {shortcut('/producao/registro', 'Registros', '📋', '#7c3aed')}
          {shortcut('/produtos', 'Produtos', '🥦', '#10b981')}
          {shortcut('/estoque', 'Estoque', '🏭', NAVY)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Colheitas recentes */}
        <div style={{ backgroundColor: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: NAVY, fontSize: 15, fontWeight: 600 }}>Colheitas Recentes</h3>
            <Link href="/lavoura/colheita" style={{ fontSize: 12, color: GREEN, textDecoration: 'none', fontWeight: 600 }}>Ver tudo →</Link>
          </div>
          {colheitas.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
              <p style={{ margin: 0 }}>Nenhuma colheita registrada</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  {['Data', 'Produto', 'Total', 'Preço/cx'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {colheitas.slice(0, 6).map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#6b7280' }}>{formatDate(new Date(c.data))}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: NAVY }}>{c.produto.nome}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: NAVY }}>{c.quantidadeTotal} cx</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: c.preco > 0 ? GREEN : '#9ca3af', fontWeight: 600 }}>
                      {c.preco > 0 ? formatCurrency(c.preco) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Registros de produção */}
        <div style={{ backgroundColor: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: NAVY, fontSize: 15, fontWeight: 600 }}>
              Registros de Produção
              {registrosPendentes > 0 && (
                <span style={{ marginLeft: 8, backgroundColor: `${ORANGE}20`, color: ORANGE, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                  {registrosPendentes} pendente{registrosPendentes !== 1 ? 's' : ''}
                </span>
              )}
            </h3>
            <Link href="/producao/registro" style={{ fontSize: 12, color: GREEN, textDecoration: 'none', fontWeight: 600 }}>Ver tudo →</Link>
          </div>
          {registros.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
              <p style={{ margin: 0 }}>Nenhum registro de produção</p>
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {registros.slice(0, 6).map((r) => {
                const custo = r.entradas.reduce((s, e) => s + e.total, 0)
                const producao = r.saidas.reduce((s, e) => s + e.total, 0)
                const margem = custo > 0 ? ((producao - custo) / custo * 100).toFixed(1) : null
                return (
                  <div key={r.id} style={{ padding: '11px 20px', borderBottom: '1px solid #f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: NAVY, margin: 0 }}>{r.descricao}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{formatDate(new Date(r.data))}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {margem !== null && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: parseFloat(margem) >= 0 ? GREEN : '#e8255a' }}>
                          {parseFloat(margem) >= 0 ? '+' : ''}{margem}%
                        </span>
                      )}
                      <span style={{
                        backgroundColor: r.status === 'FINALIZADO' ? '#f0faf0' : '#fff7ed',
                        color: r.status === 'FINALIZADO' ? GREEN : ORANGE,
                        padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                      }}>
                        {r.status === 'FINALIZADO' ? 'Finalizado' : 'Rascunho'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
