import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const produtos = await prisma.produto.findMany({
    where: { ativo: true },
    select: {
      id: true,
      nome: true,
      unidade: true,
      entradas: { select: { quantidade: true } },
    },
  })

  const alertas = produtos
    .map(p => ({
      id: p.id,
      nome: p.nome,
      unidade: p.unidade,
      saldo: p.entradas.reduce((s, e) => s + e.quantidade, 0),
    }))
    .filter(p => p.saldo < 10)
    .sort((a, b) => a.saldo - b.saldo)

  return NextResponse.json(alertas)
}
