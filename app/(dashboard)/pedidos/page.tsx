import { prisma } from '@/lib/prisma'
import PedidosWrapper from './pedidos-wrapper'

export default async function PedidosPage() {
  const [pedidos, clientes, fornecedores, produtos, rawProdutosPdv] = await Promise.all([
    prisma.pedido.findMany({
      include: {
        cliente: { include: { enderecos: true } },
        fornecedor: { include: { enderecos: true } },
        transportadora: true,
        itens: true,
      },
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

  const mapEndereco = (e: { cep: string | null; logradouro: string | null; numero: string | null; complemento: string | null; bairro: string | null; cidade: string | null; estado: string | null; referencia: string | null } | undefined) =>
    e ? {
      cep: e.cep, logradouro: e.logradouro, numero: e.numero, complemento: e.complemento,
      bairro: e.bairro, cidade: e.cidade, estado: e.estado, referencia: e.referencia,
    } : null

  return (
    <PedidosWrapper
      pedidos={pedidos.map(p => ({
        id: p.id, numero: p.numero, tipo: p.tipo, data: p.data.toISOString(),
        status: p.status, totalValor: Number(p.totalValor), frete: Number(p.frete), outrasTaxas: Number(p.outrasTaxas),
        formaPagamento: p.formaPagamento, observacao: p.observacao,
        obsInternas: p.obsInternas, obsCliente: p.obsCliente,
        cliente: p.cliente ? {
          id: p.cliente.id, nome: p.cliente.nome, cnpjCpf: p.cliente.cnpjCpf,
          telefone: p.cliente.telefone, email: p.cliente.email,
          endereco: mapEndereco(p.cliente.enderecos[0]),
        } : null,
        fornecedor: p.fornecedor ? {
          id: p.fornecedor.id, nome: p.fornecedor.nome, cnpjCpf: p.fornecedor.cnpjCpf,
          telefone: p.fornecedor.telefone, email: p.fornecedor.email,
          endereco: mapEndereco(p.fornecedor.enderecos[0]),
        } : null,
        transportadora: p.transportadora ? { id: p.transportadora.id, nome: p.transportadora.nome } : null,
        itens: p.itens.map(it => ({ id: it.id, produto: it.produto, unidade: it.unidade, quantidade: it.quantidade, valorUnit: Number(it.valorUnit), desconto: Number(it.desconto), total: Number(it.total) })),
      }))}
      clientes={clientes.map(c => ({ id: c.id, nome: c.nome }))}
      fornecedores={fornecedores.map(f => ({ id: f.id, nome: f.nome }))}
      produtos={produtos.map(p => ({ id: p.id, nome: p.nome, unidade: p.unidade }))}
      produtosPdv={rawProdutosPdv.map(p => ({
        id: p.id, nome: p.nome, precoVenda: Number(p.precoVenda), precoPromocional: Number(p.precoPromocional ?? 0),
        precoPdv: Number(p.precoPdv ?? 0),
        unidade: p.unidade, categoria: p.categoria, ativo: p.ativo,
        estoqueVinculadoId: p.estoqueVinculadoId ?? null,
        estoque: p.estoqueVinculado
          ? p.estoqueVinculado.entradas.reduce((s, e) => s + e.quantidade, 0)
          : p.entradas.reduce((s, e) => s + e.quantidade, 0),
      }))}
    />
  )
}
