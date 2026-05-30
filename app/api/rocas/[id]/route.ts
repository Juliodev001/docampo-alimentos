import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const roca = await prisma.controleRoca.update({
    where: { id },
    data: {
      codigo:        body.codigo || undefined,
      nome:          body.nome,
      area:          body.area != null ? parseFloat(body.area) : null,
      localizacao:   body.localizacao || null,
      mudasPlantadas: body.mudasPlantadas != null ? parseFloat(body.mudasPlantadas) : null,
      cultura:       body.cultura || null,
      produtorId:    body.produtorId || null,
      status:        body.status,
      dataPlantio:   body.dataPlantio ? new Date(body.dataPlantio) : null,
      dataColheita:  body.dataColheita ? new Date(body.dataColheita) : null,
      observacao:    body.observacao || null,
    },
    include: { produtor: true, registros: true },
  })
  return NextResponse.json(roca)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  // Disconnect colheitas before deleting
  await prisma.colheitaDiaria.updateMany({ where: { rocaId: id }, data: { rocaId: null } })
  await prisma.controleRoca.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
