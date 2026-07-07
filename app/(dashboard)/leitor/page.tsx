import { prisma } from '@/lib/prisma'
import LeitorClient from './leitor-client'

export const dynamic = 'force-dynamic'

export default async function LeitorPage() {
  const raw = await prisma.documentoDigitalizado.findMany({
    orderBy: { criadoEm: 'desc' },
    select: { id: true, nome: true, campos: true, total: true, criadoEm: true },
    take: 100,
  })

  const documentos = raw.map((d) => ({
    id: d.id,
    nome: d.nome,
    campos: (Array.isArray(d.campos) ? d.campos : []) as { campo: string; valor: string }[],
    total: d.total != null ? Number(d.total) : null,
    criadoEm: d.criadoEm.toISOString(),
  }))

  return <LeitorClient documentosIniciais={documentos} />
}
