import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { s } from '@/lib/serialize'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const produtorId = searchParams.get('produtorId')
  const status = searchParams.get('status')

  const fechamentos = await prisma.fechamentoPagamento.findMany({
    where: {
      ...(produtorId && { produtorId }),
      ...(status && status !== 'TODOS' && { status }),
    },
    include: { produtor: { include: { parceiros: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(s(fechamentos))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { produtorId, dataInicio, dataFim, dataPagamento, combustivel, bandejaEmbalagem, valesDinheiro, creditos, debitosAnteriores, valeIds } = body

  if (!produtorId || !dataInicio || !dataFim || !dataPagamento) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  const fechamento = await prisma.$transaction(async (tx) => {
    const created = await tx.fechamentoPagamento.create({
      data: {
        produtorId,
        dataInicio: new Date(dataInicio),
        dataFim: new Date(dataFim),
        dataPagamento: new Date(dataPagamento),
        combustivel: combustivel ?? 0,
        bandejaEmbalagem: bandejaEmbalagem ?? 0,
        valesDinheiro: valesDinheiro ?? 0,
        creditos: creditos ?? 0,
        debitosAnteriores: debitosAnteriores ?? 0,
        status: 'PENDENTE',
      },
      include: { produtor: true },
    })

    if (Array.isArray(valeIds) && valeIds.length > 0) {
      await tx.vale.updateMany({
        where: { id: { in: valeIds }, produtorId, status: 'ABERTO' },
        data: { status: 'DESCONTADO', fechamentoId: created.id },
      })
    }

    return created
  })
  return NextResponse.json(s(fechamento), { status: 201 })
}
