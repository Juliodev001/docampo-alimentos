import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { memCache } from '@/lib/mem-cache'

const KEY = 'produtos'

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await props.params
  const body = await req.json()
  // Strip fields that shouldn't be patched directly
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { estoqueAtual: _ea, ...data } = body

  // Coerce numeric-like strings to numbers
  if (data.peso !== undefined) data.peso = data.peso !== '' && data.peso != null ? parseFloat(data.peso) : null
  if (data.altura !== undefined) data.altura = data.altura !== '' && data.altura != null ? parseFloat(data.altura) : null
  if (data.largura !== undefined) data.largura = data.largura !== '' && data.largura != null ? parseFloat(data.largura) : null
  if (data.dataValidade !== undefined) data.dataValidade = data.dataValidade ? new Date(data.dataValidade) : null
  if (data.fornecedorId !== undefined && data.fornecedorId === '') data.fornecedorId = null

  const produto = await prisma.produto.update({ where: { id }, data })
  memCache.invalidate(KEY)
  return NextResponse.json(produto)
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await props.params
  try {
    await prisma.produto.delete({ where: { id } })
    memCache.invalidate(KEY)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Produto possui registros vinculados' }, { status: 409 })
  }
}
