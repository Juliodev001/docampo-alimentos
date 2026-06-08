import { prisma } from '@/lib/prisma'
import ClientesClient from './clientes-client'

export default async function ClientesPage() {
  const [clientes, pedidosPdv] = await Promise.all([
    prisma.cliente.findMany({
      orderBy: { nome: 'asc' },
      include: {
        _count: { select: { nfes: true, romaneios: true } },
        enderecos: true,
        contatos: true,
      },
    }),
    prisma.pedido.findMany({
      where: { tipo: 'PDV', clienteId: { not: null } },
      select: {
        id: true, clienteId: true, totalValor: true,
        formaPagamento: true, status: true,
        data: true, numero: true, dataCobranca: true,
      },
      orderBy: { data: 'desc' },
    }),
  ])

  // Agrega compras por cliente
  const comprasPorCliente: Record<string, {
    totalComprado: number; qtdPedidos: number; ultimaCompra: string | null
    fiadoPendente: number; pedidos: { id: string; numero: number; valor: number; data: string; formaPagamento: string | null; status: string; dataCobranca: string | null }[]
  }> = {}

  for (const p of pedidosPdv) {
    if (!p.clienteId) continue
    if (!comprasPorCliente[p.clienteId]) {
      comprasPorCliente[p.clienteId] = { totalComprado: 0, qtdPedidos: 0, ultimaCompra: null, fiadoPendente: 0, pedidos: [] }
    }
    const agg = comprasPorCliente[p.clienteId]
    agg.totalComprado += Number(p.totalValor)
    agg.qtdPedidos   += 1
    if (!agg.ultimaCompra || p.data.toISOString() > agg.ultimaCompra) agg.ultimaCompra = p.data.toISOString()
    if (p.formaPagamento === 'FIADO' && p.status !== 'PAGO') agg.fiadoPendente += Number(p.totalValor)
    agg.pedidos.push({
      id: p.id, numero: p.numero, valor: Number(p.totalValor),
      data: p.data.toISOString(), formaPagamento: p.formaPagamento,
      status: p.status, dataCobranca: p.dataCobranca?.toISOString() ?? null,
    })
  }

  return (
    <ClientesClient
      clientes={clientes.map(c => ({
        id: c.id,
        nome: c.nome,
        tipo: c.tipo,
        cnpjCpf: c.cnpjCpf,
        inscricaoEstadual: c.inscricaoEstadual,
        telefone: c.telefone,
        email: c.email,
        createdAt: c.createdAt.toISOString(),
        _count: c._count,
        enderecos: c.enderecos.map(e => ({
          id: e.id, cep: e.cep, logradouro: e.logradouro, numero: e.numero,
          complemento: e.complemento, bairro: e.bairro, cidade: e.cidade,
          estado: e.estado, referencia: e.referencia,
        })),
        contatos: c.contatos.map(ct => ({
          id: ct.id, telefone: ct.telefone, email: ct.email,
          nomeContato: ct.nomeContato, observacao: ct.observacao,
        })),
        compras: comprasPorCliente[c.id] ?? { totalComprado: 0, qtdPedidos: 0, ultimaCompra: null, fiadoPendente: 0, pedidos: [] },
      }))}
    />
  )
}
