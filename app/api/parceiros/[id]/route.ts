import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { nome, nomeFantasia, cpf, chavePix, percentual, valorEmba, endereco, telefone, produtorId } = body

  if (!nome) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })

  try {
    const parceiro = await prisma.parceiro.update({
      where: { id },
      data: {
        nome,
        nomeFantasia: nomeFantasia || null,
        cpf: cpf || null,
        chavePix: chavePix || null,
        percentual: percentual ?? 0,
        valorEmba: valorEmba ?? 0,
        endereco: endereco || null,
        telefone: telefone || null,
        ...(produtorId && { produtorId }),
      },
      include: { produtor: { select: { id: true, nome: true, codigo: true } } },
    })
    return NextResponse.json(parceiro)
  } catch (e) {
    console.error('Erro ao atualizar meeiro:', e)
    return NextResponse.json({ error: 'Erro ao atualizar meeiro.' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    // Disconnect from colheitas before deleting
    await prisma.colheitaDiaria.updateMany({ where: { parceiroId: id }, data: { parceiroId: null } })
    await prisma.parceiro.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir meeiro.' }, { status: 500 })
  }
}
