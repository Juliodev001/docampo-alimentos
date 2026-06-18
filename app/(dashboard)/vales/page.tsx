import { prisma } from '@/lib/prisma'
import ValesClient from './vales-client'

export default async function ValesPage() {
  const [rawVales, produtores, parceiros] = await Promise.all([
    prisma.vale.findMany({
      include: {
        produtor: { select: { id: true, nome: true, codigo: true } },
        parceiro: { select: { id: true, nome: true, codigo: true, produtor: { select: { nome: true } } } },
      },
      orderBy: { data: 'desc' },
    }),
    prisma.produtor.findMany({
      select: { id: true, nome: true, codigo: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.parceiro.findMany({
      select: { id: true, nome: true, codigo: true, produtor: { select: { nome: true } } },
      orderBy: { nome: 'asc' },
    }),
  ])

  const vales = rawVales.map(v => ({
    id: v.id,
    valor: Number(v.valor),
    data: v.data.toISOString(),
    observacao: v.observacao,
    status: v.status,
    createdAt: v.createdAt.toISOString(),
    produtor: v.produtor ? { id: v.produtor.id, nome: v.produtor.nome, codigo: v.produtor.codigo } : null,
    parceiro: v.parceiro ? { id: v.parceiro.id, nome: v.parceiro.nome, codigo: v.parceiro.codigo, produtorNome: v.parceiro.produtor.nome } : null,
  }))

  return (
    <ValesClient
      vales={vales}
      produtores={produtores}
      parceiros={parceiros.map(p => ({ id: p.id, nome: p.nome, codigo: p.codigo, produtorNome: p.produtor.nome }))}
    />
  )
}
