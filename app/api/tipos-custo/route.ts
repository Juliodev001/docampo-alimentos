import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tipos = await prisma.tipoCusto.findMany({ orderBy: { nome: 'asc' } })
  return NextResponse.json(tipos)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { nome } = await req.json()
  if (!nome?.trim()) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })

  try {
    const tipo = await prisma.tipoCusto.create({ data: { nome: nome.trim() } })
    return NextResponse.json(tipo, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Já existe um tipo com esse nome.' }, { status: 409 })
  }
}
