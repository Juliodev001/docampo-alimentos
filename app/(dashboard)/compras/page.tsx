import { prisma } from '@/lib/prisma'
import ComprasClient from './compras-client'

export default async function ComprasPage() {
  const centrosCusto = await prisma.centroCusto.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  })

  return <ComprasClient centrosCusto={centrosCusto} />
}
