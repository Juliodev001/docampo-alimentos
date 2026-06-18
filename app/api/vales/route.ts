import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const produtorId = searchParams.get('produtorId')
  const parceiroId = searchParams.get('parceiroId')
  const status = searchParams.get('status')

  const vales = await prisma.vale.findMany({
    where: {
      ...(produtorId && { produtorId }),
      ...(parceiroId && { parceiroId }),
      ...(status && { status }),
    },
    include: {
      produtor: { select: { id: true, nome: true, codigo: true } },
      parceiro: { select: { id: true, nome: true, codigo: true, produtorId: true } },
    },
    orderBy: { data: 'desc' },
  })
  return NextResponse.json(vales)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { produtorId, parceiroId, valor, data, observacao } = await req.json()

  if (!produtorId && !parceiroId) {
    return NextResponse.json({ error: 'Selecione um produtor ou um meeiro.' }, { status: 400 })
  }
  if (produtorId && parceiroId) {
    return NextResponse.json({ error: 'Selecione apenas um beneficiário: produtor ou meeiro.' }, { status: 400 })
  }
  if (!valor || Number(valor) <= 0) {
    return NextResponse.json({ error: 'Valor inválido.' }, { status: 400 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Data é obrigatória.' }, { status: 400 })
  }

  try {
    const vale = await prisma.vale.create({
      data: {
        produtorId: produtorId || null,
        parceiroId: parceiroId || null,
        valor: Number(valor),
        data: new Date(data),
        observacao: observacao?.trim() || null,
        status: 'ABERTO',
      },
    })
    return NextResponse.json(vale, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
