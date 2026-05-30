import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { parceiroId, valor, formaPag, conta, dataPag, observacao } = await req.json()
    if (!parceiroId || !dataPag) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })

    const pagamento = await prisma.pagamentoMeeiro.create({
      data: {
        parceiroId,
        valor: Number(valor),
        formaPag: formaPag ?? 'PIX',
        conta: conta || null,
        dataPag: new Date(dataPag),
        observacao: observacao || null,
        status: 'CONFIRMADO',
      },
    })

    return NextResponse.json(pagamento)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erro ao registrar pagamento' }, { status: 500 })
  }
}

export async function GET() {
  const pagamentos = await prisma.pagamentoMeeiro.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(pagamentos)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.pagamentoMeeiro.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
