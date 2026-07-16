import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const parceiro = await prisma.parceiro.findUnique({
    where: { id },
    include: { produtor: { select: { id: true, nome: true, codigo: true, cpf: true } } },
  })
  if (!parceiro) return NextResponse.json({ error: 'Meeiro não encontrado' }, { status: 404 })

  const [colheitas, pagamentos, fechamentosPagos] = await Promise.all([
    prisma.colheitaDiaria.findMany({
      where: { parceiroId: id },
      include: { produto: { select: { id: true, nome: true } }, roca: { select: { nome: true } } },
      orderBy: { data: 'asc' },
    }),
    prisma.pagamentoMeeiro.aggregate({
      // DESCONTADO = absorvido por um fechamento; continua sendo dinheiro já pago
      where: { parceiroId: id, status: { in: ['CONFIRMADO', 'DESCONTADO'] } },
      _sum: { valor: true },
    }),
    prisma.fechamentoMeeiro.aggregate({
      where: { parceiroId: id, status: 'PAGO' },
      _sum: { valorPago: true },
    }),
  ])

  const pagamentosAnteriores =
    Number(pagamentos._sum.valor ?? 0) + Number(fechamentosPagos._sum.valorPago ?? 0)

  return NextResponse.json({ parceiro, colheitas, pagamentosAnteriores })
}
