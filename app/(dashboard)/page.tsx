import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import DashboardClient from './dashboard-client'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const centrosCusto = await prisma.centroCusto.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  })

  return <DashboardClient centrosCusto={centrosCusto} />
}
