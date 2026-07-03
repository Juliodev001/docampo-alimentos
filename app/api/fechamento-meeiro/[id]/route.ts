import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { s } from '@/lib/serialize'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const fechamento = await prisma.fechamentoMeeiro.findUnique({
    where: { id },
    include: { parceiro: { include: { produtor: true } }, vales: true },
  })
  if (!fechamento) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  const dataFimFim = new Date(fechamento.dataFim)
  dataFimFim.setUTCDate(dataFimFim.getUTCDate() + 1)
  const [colheitas, [extra]] = await Promise.all([
    prisma.colheitaDiaria.findMany({
      where: {
        parceiroId: fechamento.parceiroId,
        data: { gte: fechamento.dataInicio, lt: dataFimFim },
      },
      include: { produto: true, roca: { select: { nome: true } } },
      orderBy: { data: 'asc' },
    }),
    prisma.$queryRaw<{ datasAdicionais: string | null }[]>`SELECT "datasAdicionais" FROM "FechamentoMeeiro" WHERE id = ${id}`,
  ])
  const datasAdicionais: string[] = extra?.datasAdicionais ? JSON.parse(extra.datasAdicionais) : []

  return NextResponse.json(s({ ...fechamento, colheitas, datasAdicionais }))
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const fechamento = await prisma.fechamentoMeeiro.update({
    where: { id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.dataInicio && { dataInicio: new Date(body.dataInicio) }),
      ...(body.dataFim && { dataFim: new Date(body.dataFim) }),
      ...(body.dataPagamento && { dataPagamento: new Date(body.dataPagamento) }),
      ...(body.valorBruto !== undefined && { valorBruto: body.valorBruto }),
      ...(body.valorPago !== undefined && { valorPago: body.valorPago }),
      ...(body.combustivel !== undefined && { combustivel: body.combustivel }),
      ...(body.bandejaEmbalagem !== undefined && { bandejaEmbalagem: body.bandejaEmbalagem }),
      ...(body.valesDinheiro !== undefined && { valesDinheiro: body.valesDinheiro }),
      ...(body.creditos !== undefined && { creditos: body.creditos }),
      ...(body.debitosAnteriores !== undefined && { debitosAnteriores: body.debitosAnteriores }),
      ...(body.valesDeduzidos !== undefined && { valesDeduzidos: body.valesDeduzidos }),
      ...(body.observacao !== undefined && { observacao: body.observacao?.trim() || null }),
    },
    include: { parceiro: true },
  })
  return NextResponse.json(s(fechamento))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.$transaction([
    prisma.vale.updateMany({
      where: { fechamentoMeeiroId: id },
      data: { status: 'ABERTO', fechamentoMeeiroId: null },
    }),
    prisma.fechamentoMeeiro.delete({ where: { id } }),
  ])
  return NextResponse.json({ ok: true })
}
