import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

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
  return NextResponse.json(fechamentos)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { produtorId, dataInicio, dataFim, dataPagamento, valesEmbalagem, valesDinheiro, creditos, debitosAnteriores } = body

  if (!produtorId || !dataInicio || !dataFim || !dataPagamento) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  const fechamento = await prisma.fechamentoPagamento.create({
    data: {
      produtorId,
      dataInicio: new Date(dataInicio),
      dataFim: new Date(dataFim),
      dataPagamento: new Date(dataPagamento),
      valesEmbalagem: valesEmbalagem ?? 0,
      valesDinheiro: valesDinheiro ?? 0,
      creditos: creditos ?? 0,
      debitosAnteriores: debitosAnteriores ?? 0,
      status: 'PENDENTE',
    },
    include: { produtor: true },
  })
  return NextResponse.json(fechamento, { status: 201 })
}
