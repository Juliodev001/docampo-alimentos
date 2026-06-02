import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const pedidos = await prisma.pedido.findMany({
    include: { cliente: true, fornecedor: true, transportadora: true, itens: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(pedidos)
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

  const subtotal   = itens.reduce((s: number, it: { total: number }) => s + it.total, 0)
  const totalValor = subtotal + (frete ?? 0) + (outrasTaxas ?? 0)

  const pedido = await prisma.pedido.create({
    data: {
      tipo:            tipo ?? 'VENDA',
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
        create: itens.map((it: { produtoId?: string; produto: string; unidade: string; quantidade: number; valorUnit: number; desconto: number; total: number }) => ({
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

  return NextResponse.json(pedido, { status: 201 })
}
