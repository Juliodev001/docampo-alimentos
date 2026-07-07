import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

/** GET /api/documentos/:id — detalhe completo (inclui a imagem e o texto bruto). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const doc = await prisma.documentoDigitalizado.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })

  return NextResponse.json(doc)
}

/** DELETE /api/documentos/:id — remove o documento. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.documentoDigitalizado.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
