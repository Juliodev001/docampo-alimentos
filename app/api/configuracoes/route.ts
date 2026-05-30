import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const chave = searchParams.get('chave')

  if (chave) {
    const cfg = await prisma.configuracao.findUnique({ where: { chave } })
    return NextResponse.json({ chave, valor: cfg?.valor ?? null })
  }

  const configs = await prisma.configuracao.findMany()
  const map: Record<string, string> = {}
  for (const c of configs) map[c.chave] = c.valor
  return NextResponse.json(map)
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as Record<string, string>

  const ops = Object.entries(body).map(([chave, valor]) =>
    prisma.configuracao.upsert({
      where: { chave },
      update: { valor: String(valor) },
      create: { chave, valor: String(valor) },
    })
  )
  await Promise.all(ops)
  return NextResponse.json({ ok: true })
}
