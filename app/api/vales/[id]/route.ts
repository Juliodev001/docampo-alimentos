import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await props.params
  const body = await req.json()

  if (body.status !== 'CANCELADO') {
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
  }

  const vale = await prisma.vale.findUnique({ where: { id } })
  if (!vale) return NextResponse.json({ error: 'Vale não encontrado.' }, { status: 404 })
  if (vale.status === 'CANCELADO') return NextResponse.json(vale)

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (vale.fechamentoMeeiroId) {
        const fech = await tx.fechamentoMeeiro.findUnique({ where: { id: vale.fechamentoMeeiroId } })
        if (fech?.status === 'PAGO') {
          throw new Error('Esse vale já foi descontado em um fechamento pago e não pode ser descartado.')
        }
        if (fech) {
          await tx.fechamentoMeeiro.update({
            where: { id: fech.id },
            data: {
              valesDeduzidos: { decrement: vale.valor },
              valorPago: { increment: vale.valor },
            },
          })
        }
      }
      if (vale.fechamentoId) {
        const fech = await tx.fechamentoPagamento.findUnique({ where: { id: vale.fechamentoId } })
        if (fech?.status === 'PAGO') {
          throw new Error('Esse vale já foi descontado em um fechamento pago e não pode ser descartado.')
        }
        if (fech) {
          await tx.fechamentoPagamento.update({
            where: { id: fech.id },
            data: { valesDinheiro: { decrement: vale.valor } },
          })
        }
      }
      return tx.vale.update({
        where: { id },
        data: { status: 'CANCELADO', fechamentoId: null, fechamentoMeeiroId: null },
      })
    })
    return NextResponse.json(updated)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 409 })
  }
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await props.params

  const vale = await prisma.vale.findUnique({ where: { id } })
  if (!vale) return NextResponse.json({ error: 'Vale não encontrado.' }, { status: 404 })
  if (vale.status !== 'ABERTO') {
    return NextResponse.json({ error: 'Só é possível excluir vales em aberto.' }, { status: 409 })
  }

  await prisma.vale.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
