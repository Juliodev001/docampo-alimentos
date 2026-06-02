import { prisma } from '@/lib/prisma'
import PedidosWrapper from './pedidos-wrapper'

export default async function PedidosPage() {
  const [pedidos, clientes, fornecedores, produtos, rawProdutosPdv] = await Promise.all([
    prisma.pedido.findMany({
      include: { cliente: true, fornecedor: true, transportadora: true, itens: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.cliente.findMany({ orderBy: { nome: 'asc' } }),
    prisma.fornecedor.findMany({ orderBy: { nome: 'asc' } }),
    prisma.produto.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } }),
    prisma.produto.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
      include: {
        entradas: { select: { quantidade: true } },
        estoqueVinculado: { include: { entradas: { select: { quantidade: true } } } },
      },
    }),
  ])

  return (
    <PedidosWrapper
      pedidos={pedidos.map(p => ({
        id: p.id, numero: p.numero, tipo: p.tipo, data: p.data.toISOString(),
        status: p.status, totalValor: p.totalValor, frete: p.frete, outrasTaxas: p.outrasTaxas,
        formaPagamento: p.formaPagamento, observacao: p.observacao,
        obsInternas: p.obsInternas, obsCliente: p.obsCliente,
        cliente:       p.cliente       ? { id: p.cliente.id,       nome: p.cliente.nome }       : null,
        fornecedor:    p.fornecedor    ? { id: p.fornecedor.id,    nome: p.fornecedor.nome }    : null,
        transportadora: p.transportadora ? { id: p.transportadora.id, nome: p.transportadora.nome } : null,
        itens: p.itens.map(it => ({ id: it.id, produto: it.produto, unidade: it.unidade, quantidade: it.quantidade, valorUnit: it.valorUnit, desconto: it.desconto, total: it.total })),
      }))}
      clientes={clientes.map(c => ({ id: c.id, nome: c.nome }))}
      fornecedores={fornecedores.map(f => ({ id: f.id, nome: f.nome }))}
      produtos={produtos.map(p => ({ id: p.id, nome: p.nome, unidade: p.unidade }))}
      produtosPdv={rawProdutosPdv.map(p => ({
        id: p.id, nome: p.nome, precoVenda: p.precoVenda, precoPromocional: p.precoPromocional,
        precoPdv: p.precoPdv,
        unidade: p.unidade, categoria: p.categoria, ativo: p.ativo,
        estoqueVinculadoId: p.estoqueVinculadoId ?? null,
        estoque: p.estoqueVinculado
          ? p.estoqueVinculado.entradas.reduce((s, e) => s + e.quantidade, 0)
          : p.entradas.reduce((s, e) => s + e.quantidade, 0),
      }))}
    />
  )
}
