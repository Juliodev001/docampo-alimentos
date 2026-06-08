import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'

const GREEN = '#5ab952'
const NAVY = '#2d3561'

export default async function RegistroProducaoPage() {
  const registros = await prisma.registroProducao.findMany({
    include: { entradas: true, saidas: true },
    orderBy: { data: 'desc' },
  })

  return (
    <div>
      <div className="flex-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: NAVY, margin: 0 }}>Registro de Produção</h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Vincule entradas (matéria-prima) a saídas (produtos acabados)</p>
        </div>
        <Link href="/producao/registro/novo"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', backgroundColor: GREEN, color: 'white', borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
          + Novo registro de produção
        </Link>
      </div>

      {registros.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: 14, padding: 64, textAlign: 'center', color: '#9ca3af', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          Nenhum registro de produção
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {registros.map((r) => {
            const custoTotal = r.entradas.reduce((s, e) => s + Number(e.total), 0)
            const receitaTotal = r.saidas.reduce((s, s2) => s + Number(s2.total), 0)
            return (
              <div key={r.id} style={{ backgroundColor: 'white', borderRadius: 12, padding: '18px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 600, color: NAVY, margin: 0 }}>{r.descricao}</p>
                  <p style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>{formatDate(r.data)}</p>
                </div>
                <div style={{ display: 'flex', gap: 24 }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Custo</p>
                    <p style={{ fontWeight: 600, color: '#e8255a', margin: '2px 0 0' }}>{formatCurrency(custoTotal)}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Produção</p>
                    <p style={{ fontWeight: 600, color: GREEN, margin: '2px 0 0' }}>{formatCurrency(receitaTotal)}</p>
                  </div>
                  <span style={{ backgroundColor: r.status === 'FINALIZADO' ? '#f0faf0' : '#fff7ed', color: r.status === 'FINALIZADO' ? GREEN : '#e87320', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, alignSelf: 'center' }}>
                    {r.status === 'FINALIZADO' ? 'Finalizado' : 'Rascunho'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
