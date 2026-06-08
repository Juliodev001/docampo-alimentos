import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { s } from '@/lib/serialize'
import CompraDetalheClient from './compra-detalhe-client'

export default async function CompraDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const compra = await prisma.compra.findUnique({
    where: { id },
    include: { fornecedor: true, centroCusto: true, itens: true },
  })
  if (!compra) notFound()
  return <CompraDetalheClient compra={s(compra) as never} />
}
