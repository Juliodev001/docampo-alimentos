import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { s } from '@/lib/serialize'

export async function GET() {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const pedidos = await prisma.pedido.findMany({
    include: { cliente: true, fornecedor: true, transportadora: true, itens: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(s(pedidos))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    tipo, clienteId, fornecedorId,
    transportadoraId, data, dataEntrega,
    formaPagamento, dataCobranca, frete, outrasTaxas,
    observacao, obsInternas, obsCliente,
    itens,
  } = await req.json()

  if (!data || !itens?.length) {
    return NextResponse.json({ error: 'Data e itens são obrigatórios.' }, { status: 400 })
  }
  if (tipo === 'VENDA' && !clienteId) {
    return NextResponse.json({ error: 'Selecione um cliente para pedido de venda.' }, { status: 400 })
  }
  if (tipo === 'COMPRA' && !fornecedorId) {
    return NextResponse.json({ error: 'Selecione um fornecedor para pedido de compra.' }, { status: 400 })
  }

  // Total sempre recalculado no servidor — nunca confiar no valor vindo do cliente
  type ItemPedido = { produtoId?: string; produto: string; unidade: string; quantidade: number; valorUnit: number; desconto?: number; total: number }
  const itensCalc: ItemPedido[] = (itens as ItemPedido[]).map(it => ({
    ...it,
    total: Math.max(0, (Number(it.quantidade) || 0) * (Number(it.valorUnit) || 0) - (Number(it.desconto) || 0)),
  }))
  const subtotal   = itensCalc.reduce((s: number, it: ItemPedido) => s + it.total, 0)
  const totalValor = subtotal + (frete ?? 0) + (outrasTaxas ?? 0)

  const pedido = await prisma.pedido.create({
    data: {
      tipo:            tipo ?? 'VENDA',
      status:          tipo === 'PDV' && formaPagamento !== 'FIADO' ? 'PAGO' : undefined,
      clienteId:       clienteId   || null,
      fornecedorId:    fornecedorId || null,
      transportadoraId: transportadoraId || null,
      data:            new Date(data),
      dataEntrega:     dataEntrega ? new Date(dataEntrega) : null,
      formaPagamento:  formaPagamento || null,
      dataCobranca:    formaPagamento === 'FIADO' && dataCobranca ? new Date(dataCobranca) : null,
      frete:           frete       ?? 0,
      outrasTaxas:     outrasTaxas ?? 0,
      observacao:      observacao  || null,
      obsInternas:     obsInternas || null,
      obsCliente:      obsCliente  || null,
      totalValor,
      itens: {
        create: itensCalc.map(it => ({
          produto:    it.produto,
          unidade:    (it.unidade ?? 'CAIXA') as never,
          quantidade: it.quantidade,
          valorUnit:  it.valorUnit,
          desconto:   it.desconto ?? 0,
          total:      it.total,
        })),
      },
    },
    include: { cliente: true, fornecedor: true, transportadora: true, itens: true },
  })

  // Deduz estoque para vendas PDV (usa estoque vinculado se houver)
  if (tipo === 'PDV') {
    for (const it of itens as { produtoId?: string; quantidade: number; valorUnit: number }[]) {
      if (it.produtoId) {
        const prod = await prisma.produto.findUnique({ where: { id: it.produtoId }, select: { estoqueVinculadoId: true } })
        const estoqueId = prod?.estoqueVinculadoId ?? it.produtoId
        await prisma.entradaEstoque.create({
          data: {
            produtoId:  estoqueId,
            quantidade: -it.quantidade,
            valorUnit:  it.valorUnit,
            data:       new Date(data),
            observacao: `Venda PDV #${pedido.numero}`,
          },
        })
      }
    }
  }

  return NextResponse.json(s(pedido), { status: 201 })
}
