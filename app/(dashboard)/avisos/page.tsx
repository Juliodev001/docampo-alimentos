import { prisma } from '@/lib/prisma'
import AvisosClient from './avisos-client'

export default async function AvisosPage() {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  // Fiados em aberto
  const fiados = await prisma.pedido.findMany({
    where: { tipo: 'PDV', formaPagamento: 'FIADO', status: { in: ['ABERTO', 'CONFIRMADO', 'ENTREGUE'] } },
    include: { cliente: true },
    orderBy: { dataCobranca: 'asc' },
  })

  // Histórico de compras por cliente (todos os PDV)
  const pedidosPdv = await prisma.pedido.findMany({
    where: { tipo: 'PDV', clienteId: { not: null } },
    include: { cliente: true },
    orderBy: { data: 'desc' },
  })

  // Agrupa por cliente
  const clienteMap: Record<string, {
    id: string; nome: string; telefone: string | null; email: string | null
    totalComprado: number; qtdPedidos: number; ultimaCompra: string
  }> = {}

  for (const p of pedidosPdv) {
    if (!p.clienteId || !p.cliente) continue
    if (!clienteMap[p.clienteId]) {
      clienteMap[p.clienteId] = {
        id: p.clienteId,
        nome: p.cliente.nome,
        telefone: p.cliente.telefone,
        email: p.cliente.email,
        totalComprado: 0,
        qtdPedidos: 0,
        ultimaCompra: p.data.toISOString(),
      }
    }
    clienteMap[p.clienteId].totalComprado += Number(p.totalValor)
    clienteMap[p.clienteId].qtdPedidos   += 1
  }

  const clientes = Object.values(clienteMap).sort((a, b) => b.totalComprado - a.totalComprado)

  return (
    <AvisosClient
      fiados={fiados.map(f => ({
        id:          f.id,
        numero:      f.numero,
        clienteNome: f.cliente?.nome ?? 'Sem cliente',
        telefone:    f.cliente?.telefone ?? null,
        valor:       Number(f.totalValor),
        dataVenda:   f.data.toISOString(),
        dataCobranca: f.dataCobranca?.toISOString() ?? null,
        status:      f.status,
      }))}
      clientes={clientes}
      hoje={hoje.toISOString()}
    />
  )
}
