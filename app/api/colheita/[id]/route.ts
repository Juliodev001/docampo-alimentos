import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { s } from '@/lib/serialize'
import { sincronizarEstoqueDaColheita, removerEstoqueDaColheita } from '@/lib/estoque-colheita'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { aprovado } = await req.json()
  const updated = await prisma.colheitaDiaria.update({ where: { id }, data: { aprovado } })
  return NextResponse.json(s(updated))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    // Primeiro a entrada de estoque: apagar a colheita e deixar a caixa no
    // saldo faria o PDV vender o que não existe.
    await removerEstoqueDaColheita(id)
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
        data:               body.data ? new Date(body.data) : undefined,
        rocaId:             body.rocaId !== undefined ? body.rocaId : undefined,
        produtoId:          body.produtoId ?? undefined,
        produtorId:         body.produtorId !== undefined ? body.produtorId : undefined,
        parceiroId:         body.parceiroId !== undefined ? body.parceiroId : undefined,
        quantidadeTotal:    body.quantidadeTotal ?? undefined,
        preco:              body.preco ?? undefined,
        percParceiro:       body.percParceiro ?? undefined,
        percDono:           body.percDono ?? undefined,
        quantidadeDono:     body.quantidadeTotal != null ? body.quantidadeTotal * ((body.percDono ?? 60) / 100) : undefined,
        quantidadeParceiro: body.quantidadeTotal != null ? body.quantidadeTotal * ((body.percParceiro ?? 40) / 100) : undefined,
        bandeja:            body.bandeja ?? undefined,
        nrDoc:              body.nrDoc !== undefined ? body.nrDoc : undefined,
        observacao:         body.observacao ?? undefined,
      },
    })

    // Refaz a entrada de estoque com os valores que ficaram gravados — a
    // edição pode ter trocado produto, data ou quantidade.
    await sincronizarEstoqueDaColheita({
      id:              updated.id,
      produtoId:       updated.produtoId,
      quantidadeTotal: updated.quantidadeTotal,
      descarte:        updated.descarte,
      preco:           Number(updated.preco),
      data:            updated.data,
    })

    return NextResponse.json(s(updated))
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
