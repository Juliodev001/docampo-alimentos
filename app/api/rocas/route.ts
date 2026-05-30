import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rocas = await prisma.controleRoca.findMany({
    include: { produtor: true, registros: { orderBy: { data: 'desc' } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(rocas)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { nome, area, localizacao, mudasPlantadas, cultura, produtorId, status, dataPlantio, dataColheita, observacao } = body

  if (!nome) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })

  // Auto-generate código R001...
  let codigo = body.codigo?.trim() || null
  if (!codigo) {
    const count = await prisma.controleRoca.count()
    codigo = `R${String(count + 1).padStart(3, '0')}`
    let suffix = count + 1
    while (await prisma.controleRoca.findUnique({ where: { codigo } })) {
      suffix++
      codigo = `R${String(suffix).padStart(3, '0')}`
    }
  } else {
    const existing = await prisma.controleRoca.findUnique({ where: { codigo } })
    if (existing) return NextResponse.json({ error: 'Código já cadastrado.' }, { status: 400 })
  }

  const roca = await prisma.controleRoca.create({
    data: {
      codigo,
      nome,
      area: area != null ? parseFloat(area) : null,
      localizacao: localizacao || null,
      mudasPlantadas: mudasPlantadas != null ? parseFloat(mudasPlantadas) : null,
      cultura: cultura || null,
      produtorId: produtorId || null,
      status: status || 'ATIVA',
      dataPlantio: dataPlantio ? new Date(dataPlantio) : null,
      dataColheita: dataColheita ? new Date(dataColheita) : null,
      observacao: observacao || null,
    },
    include: { produtor: true, registros: true },
  })
  return NextResponse.json(roca, { status: 201 })
}
