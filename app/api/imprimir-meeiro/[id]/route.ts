import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const parceiro = await prisma.parceiro.findUnique({
    where: { id },
    include: { produtor: { select: { id: true, nome: true, codigo: true, cpf: true } } },
  })
  if (!parceiro) return NextResponse.json({ error: 'Meeiro não encontrado' }, { status: 404 })

  const colheitas = await prisma.colheitaDiaria.findMany({
    where: { parceiroId: id },
    include: { produto: { select: { id: true, nome: true } } },
    orderBy: { data: 'asc' },
  })

  return NextResponse.json({ parceiro, colheitas })
}
