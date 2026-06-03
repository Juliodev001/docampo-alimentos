import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatCPF, formatDate } from '@/lib/utils'

const GREEN = '#5ab952'
const NAVY = '#2d3561'
const PINK = '#e8255a'
const ORANGE = '#e87320'

export default async function ProdutorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const produtor = await prisma.produtor.findUnique({
    where: { id },
    include: { parceiros: { orderBy: { createdAt: 'asc' } } },
  })

  if (!produtor) notFound()

  const totalPerc = produtor.parceiros.reduce((s, p) => s + p.percentual, 0)
  const restante = 100 - totalPerc

  return (
    <div>
      <div className="flex-header">
        <div>
          <Link href="/produtores" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
            ← Voltar para produtores
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: NAVY, margin: 0 }}>{produtor.nome}</h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{produtor.cpf ? `CPF/CNPJ: ${formatCPF(produtor.cpf)} · ` : ''}Cadastrado em {formatDate(produtor.createdAt)}</p>
        </div>
        <Link href={`/produtores/${id}/editar`}
          style={{ padding: '9px 18px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: 'white', textDecoration: 'none', fontSize: 13, color: NAVY }}>
          Editar
        </Link>
      </div>

      <div className="chart-grid-side" style={{ gap: 20 }}>
        {/* Info card */}
        <div style={{ backgroundColor: 'white', borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', height: 'fit-content' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: NAVY, margin: '0 0 16px' }}>Informações</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <p style={{ color: '#9ca3af', fontSize: 12, margin: 0 }}>Nome completo</p>
              <p style={{ color: NAVY, fontWeight: 600, margin: '2px 0 0' }}>{produtor.nome}</p>
            </div>
            <div>
              <p style={{ color: '#9ca3af', fontSize: 12, margin: 0 }}>CPF/CNPJ</p>
              <p style={{ color: NAVY, fontWeight: 600, margin: '2px 0 0', fontFamily: 'monospace' }}>{formatCPF(produtor.cpf)}</p>
            </div>
            {produtor.telefone && (
              <div>
                <p style={{ color: '#9ca3af', fontSize: 12, margin: 0 }}>Telefone</p>
                <p style={{ color: NAVY, fontWeight: 600, margin: '2px 0 0' }}>{produtor.telefone}</p>
              </div>
            )}
          </div>

          {/* Distribuição */}
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontSize: 13, color: NAVY, fontWeight: 600, margin: 0 }}>Distribuição</p>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{totalPerc.toFixed(1)}% alocado</p>
            </div>
            <div style={{ height: 8, borderRadius: 4, backgroundColor: '#f3f4f6', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, backgroundColor: totalPerc > 100 ? PINK : GREEN, width: `${Math.min(totalPerc, 100)}%`, transition: 'width 0.3s' }} />
            </div>
            {restante > 0 && (
              <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0 0' }}>{restante.toFixed(1)}% restante sem alocação</p>
            )}
            {totalPerc > 100 && (
              <p style={{ fontSize: 12, color: PINK, margin: '6px 0 0' }}>⚠ Total excede 100%</p>
            )}
          </div>
        </div>

        {/* Parceiros */}
        <div style={{ backgroundColor: 'white', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: NAVY, fontSize: 15, fontWeight: 600 }}>Parceiros · {produtor.parceiros.length}</h3>
          </div>

          {produtor.parceiros.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af' }}>Nenhum parceiro cadastrado</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  {['Nome', 'CPF/CNPJ', 'Participação', 'Cadastrado em'].map((h) => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {produtor.parceiros.map((parceiro) => (
                  <tr key={parceiro.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: NAVY }}>{parceiro.nome}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280', fontFamily: 'monospace' }}>{formatCPF(parceiro.cpf)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ height: 6, borderRadius: 3, backgroundColor: '#f3f4f6', width: 80, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 3, backgroundColor: GREEN, width: `${parceiro.percentual}%` }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: GREEN }}>{parceiro.percentual}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{formatDate(parceiro.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
