import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    await prisma.colheitaDiaria.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  try {
    const updated = await prisma.colheitaDiaria.update({
      where: { id },
      data: {
        data:            body.data ? new Date(body.data) : undefined,
        rocaId:          body.rocaId ?? undefined,
        produtoId:       body.produtoId ?? undefined,
        produtorId:      body.produtorId ?? undefined,
        parceiroId:      body.parceiroId ?? undefined,
        quantidadeTotal: body.quantidadeTotal ?? undefined,
        preco:           body.preco ?? undefined,
        percParceiro:    body.percParceiro ?? undefined,
        percDono:        body.percDono ?? undefined,
        quantidadeDono:      body.quantidadeTotal != null ? body.quantidadeTotal * ((body.percDono ?? 60) / 100) : undefined,
        quantidadeParceiro:  body.quantidadeTotal != null ? body.quantidadeTotal * ((body.percParceiro ?? 40) / 100) : undefined,
        observacao:      body.observacao ?? undefined,
      },
    })
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
