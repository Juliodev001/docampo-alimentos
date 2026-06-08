import { prisma } from '@/lib/prisma'
import { s } from '@/lib/serialize'
import SaidaClient from './saida-client'

export default async function SaidaLavouraPage() {
  const saidas = await prisma.saidaLavoura.findMany({
    include: { produto: true, responsavel: { select: { name: true } } },
    orderBy: { data: 'desc' },
  })

  const totalQtd = saidas.reduce((s, x) => s + x.quantidade, 0)
  const totalValor = saidas.reduce((s, x) => s + Number(x.totalValor), 0)
  const ticketMedio = saidas.length > 0 ? totalValor / saidas.length : 0

  return <SaidaClient saidas={s(saidas) as never} totalQtd={totalQtd} totalValor={totalValor} ticketMedio={ticketMedio} />
}
