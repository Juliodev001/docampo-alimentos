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
  // não é mais cobrado.
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

  // Vale preso a um fechamento: o acerto já contou com ele, então a edição
  // precisa mexer nos dois lados juntos.
  const emFechamento = Boolean(vale.fechamentoId || vale.fechamentoMeeiroId)
  const trocouBeneficiario =
    (produtorId || null) !== vale.produtorId || (parceiroId || null) !== vale.parceiroId

  if (emFechamento && trocouBeneficiario) {
    return NextResponse.json(
      { error: 'Não dá para trocar o beneficiário de um vale já descontado — ele está no fechamento de outra pessoa. Descarte este e lance um novo.' },
      { status: 409 },
    )
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // A diferença de valor tem que ser espelhada no fechamento: o que o vale
      // deduz a mais, a pessoa recebe a menos. Sem isso o acerto ficaria
      // dizendo um número e o vale, outro.
      const delta = Number(valor) - Number(vale.valor)

      if (vale.fechamentoMeeiroId) {
        const fech = await tx.fechamentoMeeiro.findUnique({ where: { id: vale.fechamentoMeeiroId } })
        if (fech?.status === 'PAGO') {
          throw new Error('Esse vale já foi descontado em um fechamento PAGO. Reabrir um pagamento fechado mudaria um acerto já quitado — descarte o vale e lance um novo.')
        }
        if (fech && delta !== 0) {
          await tx.fechamentoMeeiro.update({
            where: { id: fech.id },
            data: {
              valesDeduzidos: { increment: delta },
              valorPago: { decrement: delta },
            },
          })
        }
      }

      if (vale.fechamentoId) {
        const fech = await tx.fechamentoPagamento.findUnique({ where: { id: vale.fechamentoId } })
        if (fech?.status === 'PAGO') {
          throw new Error('Esse vale já foi descontado em um fechamento PAGO. Reabrir um pagamento fechado mudaria um acerto já quitado — descarte o vale e lance um novo.')
        }
        // Nada a ajustar aqui: no fechamento do produtor o abatimento é somado
        // pelo vínculo (Vale.fechamentoId) na hora de montar o acerto, não
        // guardado num campo — ver o mesmo raciocínio no cancelamento acima.
      }

      return tx.vale.update({
        where: { id },
        data: {
          produtorId: produtorId || null,
          parceiroId: parceiroId || null,
          valor: Number(valor),
          data: new Date(data),
          observacao: observacao?.trim() || null,
        },
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
