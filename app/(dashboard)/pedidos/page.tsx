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

  // Preço médio praticado por produto, em cada janela de tempo do filtro do PDV.
  // É média ponderada pela quantidade (soma dos valores ÷ soma das caixas), sobre
  // os itens já vendidos (VENDA e PDV, fora os cancelados). O ItemPedido guarda
  // só o nome do produto, não o id, então o cruzamento é pelo nome normalizado.
  const chaveProduto = (nome: string) => nome.trim().toUpperCase()

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

  for (const pedido of pedidos) {
    if (pedido.tipo !== 'VENDA' && pedido.tipo !== 'PDV') continue
    if (pedido.status === 'CANCELADO') continue
    for (const item of pedido.itens) {
      if (item.quantidade <= 0) continue
      const chave = chaveProduto(item.produto)
      const valor = Number(item.valorUnit) * item.quantidade
      for (const janela of JANELAS) {
        if (janela.inicio && pedido.data < janela.inicio) continue
        const mapa = acumuladoPorJanela.get(janela.periodo)!
        const acc = mapa.get(chave) ?? { quantidade: 0, valor: 0 }
        acc.quantidade += item.quantidade
        acc.valor += valor
        mapa.set(chave, acc)
      }
    }
  }

  const mediaDe = (periodo: string, nome: string) => {
    const acc = acumuladoPorJanela.get(periodo)?.get(chaveProduto(nome))
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
          dia:    mediaDe('dia',    p.nome),
          semana: mediaDe('semana', p.nome),
          mes:    mediaDe('mes',    p.nome),
          ano:    mediaDe('ano',    p.nome),
          tudo:   mediaDe('tudo',   p.nome),
        },
      }))}
    />
  )
}
