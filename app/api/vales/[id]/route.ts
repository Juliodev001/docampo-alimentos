import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await props.params
  const body = await req.json()

  const vale = await prisma.vale.findUnique({ where: { id } })
  if (!vale) return NextResponse.json({ error: 'Vale não encontrado.' }, { status: 404 })

  // ─── Descartar (cancelar) ─────────────────────────────────────────────────
  if (body.status === 'CANCELADO') {
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
          // Nada a devolver no fechamento: o abatimento do vale vem do vínculo
          // (Vale.fechamentoId), não do campo `valesDinheiro`. Descontar daqui
          // também tiraria o valor duas vezes — o antigo `decrement` só fazia
          // sentido quando o vale era somado em `valesDinheiro` ao fechar.
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

  // ─── Editar (valor, data, observação, beneficiário) ───────────────────────
  // Só vale em aberto: um vale DESCONTADO está preso a um fechamento e mexer no
  // valor aqui deixaria o acerto (valesDeduzidos) dessincronizado; um CANCELADO
  // não é mais cobrado. Para corrigir esses, descarte e lance de novo.
  if (vale.status !== 'ABERTO') {
    return NextResponse.json({ error: 'Só é possível editar vales em aberto.' }, { status: 409 })
  }

  const { produtorId, parceiroId, valor, data, observacao } = body
  if (!produtorId && !parceiroId) {
    return NextResponse.json({ error: 'Selecione um produtor ou um meeiro.' }, { status: 400 })
  }
  if (produtorId && parceiroId) {
    return NextResponse.json({ error: 'Selecione apenas um beneficiário: produtor ou meeiro.' }, { status: 400 })
  }
  if (valor == null || Number(valor) <= 0) {
    return NextResponse.json({ error: 'Valor inválido.' }, { status: 400 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Data é obrigatória.' }, { status: 400 })
  }

  try {
    const updated = await prisma.vale.update({
      where: { id },
      data: {
        produtorId: produtorId || null,
        parceiroId: parceiroId || null,
        valor: Number(valor),
        data: new Date(data),
        observacao: observacao?.trim() || null,
      },
    })
    return NextResponse.json(updated)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
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
