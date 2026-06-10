import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const usuarios = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, ativo: true, createdAt: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(usuarios)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'DONO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { name, email, password, role } = await req.json()
  if (!name || !email || !password) return NextResponse.json({ error: 'Nome, e-mail e senha obrigatórios' }, { status: 400 })
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 })
  const hashed = await bcrypt.hash(password, 10)
  // role é forçado para GERENTE; apenas DONO pode criar — e nunca cria outro DONO via API
  const safeRole = role === 'DONO' ? 'GERENTE' : (role || 'GERENTE')
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: safeRole },
    select: { id: true, name: true, email: true, role: true, ativo: true, createdAt: true },
  })
  return NextResponse.json(user, { status: 201 })
}
