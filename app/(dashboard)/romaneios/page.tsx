import { prisma } from '@/lib/prisma'
import { s } from '@/lib/serialize'
import RomaneiosClient from './romaneios-client'

export default async function RomaneiosPage() {
  const [romaneios, clientes] = await Promise.all([
    prisma.romaneio.findMany({
      include: { cliente: true, itens: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.cliente.findMany({ orderBy: { nome: 'asc' } }),
  ])
  return <RomaneiosClient romaneios={s(romaneios) as never} clientes={s(clientes) as never} />
}
