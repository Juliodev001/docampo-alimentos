import { prisma } from '@/lib/prisma'
import { s } from '@/lib/serialize'
import DevolucoesClient from './devolucoes-client'

export default async function DevolucoesPage() {
  const devolucoes = await prisma.devolucao.findMany({
    include: { cliente: true, itens: true },
    orderBy: { data: 'desc' },
  })

  const total = devolucoes.length
  const totalValor = devolucoes.reduce((s, d) => s + Number(d.totalValor), 0)
  const pendentes = devolucoes.filter((d) => d.status === 'PENDENTE').length
  const acertadas = devolucoes.filter((d) => d.status === 'ACERTADA').length

  return (
    <DevolucoesClient
      devolucoes={s(devolucoes) as never}
      total={total}
      totalValor={totalValor}
      pendentes={pendentes}
      acertadas={acertadas}
    />
  )
}
