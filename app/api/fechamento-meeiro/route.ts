import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { s } from '@/lib/serialize'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const parceiroId = searchParams.get('parceiroId')
  const status = searchParams.get('status')

  const fechamentos = await prisma.fechamentoMeeiro.findMany({
    where: {
      ...(parceiroId && { parceiroId }),
      ...(status && status !== 'TODOS' && { status }),
    },
    include: { parceiro: true, vales: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(s(fechamentos))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    parceiroId, dataInicio, dataFim, dataPagamento, valorBruto, valeIds, observacao,
    combustivel, bandejaEmbalagem, valesDinheiro, creditos, debitosAnteriores,
  } = body

  if (!parceiroId || !dataInicio || !dataFim || !dataPagamento || valorBruto == null) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  try {
    const fechamento = await prisma.$transaction(async (tx) => {
      const ids = Array.isArray(valeIds) ? valeIds : []
      let valesDeduzidos = 0

      if (ids.length > 0) {
        const vales = await tx.vale.findMany({
          where: { id: { in: ids }, parceiroId, status: 'ABERTO' },
        })
        valesDeduzidos = vales.reduce((s, v) => s + Number(v.valor), 0)
      }

      const deducoes =
        (Number(combustivel) || 0) +
        (Number(bandejaEmbalagem) || 0) +
        (Number(valesDinheiro) || 0) +
        (Number(creditos) || 0) +
        (Number(debitosAnteriores) || 0)
      const valorPago = Number(valorBruto) - deducoes - valesDeduzidos

      const created = await tx.fechamentoMeeiro.create({
        data: {
          parceiroId,
          dataInicio: new Date(dataInicio),
          dataFim: new Date(dataFim),
          dataPagamento: new Date(dataPagamento),
          valorBruto: Number(valorBruto),
          combustivel: Number(combustivel) || 0,
          bandejaEmbalagem: Number(bandejaEmbalagem) || 0,
          valesDinheiro: Number(valesDinheiro) || 0,
          creditos: Number(creditos) || 0,
          debitosAnteriores: Number(debitosAnteriores) || 0,
          valesDeduzidos,
          valorPago,
          observacao: observacao?.trim() || null,
          status: 'PENDENTE',
        },
        include: { parceiro: true },
      })

      if (ids.length > 0) {
        await tx.vale.updateMany({
          where: { id: { in: ids }, parceiroId, status: 'ABERTO' },
          data: { status: 'DESCONTADO', fechamentoMeeiroId: created.id },
        })
      }

      return created
    })
    return NextResponse.json(s(fechamento), { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
