import { prisma } from '@/lib/prisma'
import PedidosWrapper from './pedidos-wrapper'

export default async function PedidosPage() {
  const [pedidos, clientes, fornecedores, produtos, rawProdutosPdv, colheitas] = await Promise.all([
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
    prisma.colheitaDiaria.findMany({
      select: { produtoId: true, quantidadeTotal: true, descarte: true, preco: true, data: true },
    }),
  ])

  // Preço médio de COMPRA por produto, em cada janela de tempo do filtro do PDV.
  // É o que se pagou ao produtor/meeiro pela caixa — média ponderada pela
  // quantidade líquida (total − descarte), a mesma conta do card "Preço médio cx
  // morango" do Dashboard. Serve para o operador do PDV enxergar o custo na hora
  // de vender; antes aqui vinha a média das VENDAS, que já é o preço na tela.
  const inicioDeHoje = new Date()
  inicioDeHoje.setHours(0, 0, 0, 0)
  const desde = (dias: number) => new Date(inicioDeHoje.getTime() - dias * 86400000)
  const JANELAS = [
    { periodo: 'dia'    as const, inicio: inicioDeHoje },
    { periodo: 'semana' as const, inicio: desde(7) },
    { periodo: 'mes'    as const, inicio: desde(30) },
    { periodo: 'ano'    as const, inicio: desde(365) },
    { periodo: 'tudo'   as const, inicio: null },
  ]

  type Acumulado = { quantidade: number; valor: number }
  const acumuladoPorJanela = new Map<string, Map<string, Acumulado>>()
  for (const janela of JANELAS) acumuladoPorJanela.set(janela.periodo, new Map())

  // Cruza por produtoId — a colheita aponta o produto direto, sem depender do
  // nome digitado.
  for (const c of colheitas) {
    const liquido = c.quantidadeTotal - c.descarte
    if (liquido <= 0) continue
    const valor = Number(c.preco) * liquido
    for (const janela of JANELAS) {
      if (janela.inicio && c.data < janela.inicio) continue
      const mapa = acumuladoPorJanela.get(janela.periodo)!
      const acc = mapa.get(c.produtoId) ?? { quantidade: 0, valor: 0 }
      acc.quantidade += liquido
      acc.valor += valor
      mapa.set(c.produtoId, acc)
    }
  }

  const mediaDe = (periodo: string, produtoId: string) => {
    const acc = acumuladoPorJanela.get(periodo)?.get(produtoId)
    return acc && acc.quantidade > 0 ? acc.valor / acc.quantidade : 0
  }

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
        clienteId: p.clienteId,
        formaPagamento: p.formaPagamento, dataCobranca: p.dataCobranca ? p.dataCobranca.toISOString() : null, observacao: p.observacao,
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
        precoMedio: {
          dia:    mediaDe('dia',    p.id),
          semana: mediaDe('semana', p.id),
          mes:    mediaDe('mes',    p.id),
          ano:    mediaDe('ano',    p.id),
          tudo:   mediaDe('tudo',   p.id),
        },
      }))}
    />
  )
}
