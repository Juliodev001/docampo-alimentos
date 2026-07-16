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
    datasAdicionais, pagamentoIds,
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

      // Pagamentos avulsos já feitos ao meeiro que este fechamento absorve
      const pagIds = Array.isArray(pagamentoIds) ? pagamentoIds : []
      let pagamentosDeduzidos = 0
      if (pagIds.length > 0) {
        const pags = await tx.pagamentoMeeiro.findMany({
          where: { id: { in: pagIds }, parceiroId, status: 'CONFIRMADO', fechamentoMeeiroId: null },
        })
        pagamentosDeduzidos = pags.reduce((s, p) => s + Number(p.valor), 0)
      }

      const deducoes =
        (Number(combustivel) || 0) +
        (Number(bandejaEmbalagem) || 0) +
        (Number(valesDinheiro) || 0) +
        (Number(creditos) || 0) +
        (Number(debitosAnteriores) || 0)
      // Nunca gravar negativo: o modal exibe 0 nesses casos e um valorPago negativo
      // marcado como PAGO somaria "a receber" fantasma na lista de meeiros
      const valorPago = Math.max(0, Number(valorBruto) - deducoes - valesDeduzidos - pagamentosDeduzidos)

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

      if (pagIds.length > 0) {
        await tx.pagamentoMeeiro.updateMany({
          where: { id: { in: pagIds }, parceiroId, status: 'CONFIRMADO', fechamentoMeeiroId: null },
          data: { status: 'DESCONTADO', fechamentoMeeiroId: created.id },
        })
      }

      const datas = Array.isArray(datasAdicionais) && datasAdicionais.length > 0
        ? JSON.stringify(datasAdicionais)
        : null
      if (datas) {
        await tx.$executeRaw`UPDATE "FechamentoMeeiro" SET "datasAdicionais" = ${datas} WHERE id = ${created.id}`
      }

      return created
    })
    return NextResponse.json(s(fechamento), { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
