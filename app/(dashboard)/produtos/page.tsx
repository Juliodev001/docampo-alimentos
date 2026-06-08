import { prisma } from '@/lib/prisma'
import ProdutosClient from './produtos-client'

export default async function ProdutosPage() {
  const [rawProdutos] = await Promise.all([
    prisma.produto.findMany({
      orderBy: { nome: 'asc' },
      include: { entradas: { select: { quantidade: true } } },
    }),
  ])

  const produtos = rawProdutos.map(p => ({
    id:                   p.id,
    nome:                 p.nome,
    descricao:            p.descricao,
    sku:                  p.sku,
    preco:                Number(p.preco),
    precoVenda:           Number(p.precoVenda),
    precoPromocional:     Number(p.precoPromocional ?? 0),
    precoPdv:             Number(p.precoPdv ?? 0),
    unidade:              p.unidade,
    categoria:            p.categoria,
    fornecedorId:         p.fornecedorId,
    localizacao:          p.localizacao,
    estoqueMinimo:        p.estoqueMinimo,
    estoqueMaximo:        p.estoqueMaximo,
    ncm:                  p.ncm,
    cest:                 p.cest,
    cfop:                 p.cfop,
    peso:                 p.peso,
    altura:               p.altura,
    largura:              p.largura,
    dataValidade:         p.dataValidade?.toISOString() ?? null,
    observacao:           p.observacao,
    ativo:                p.ativo,
    createdAt:            p.createdAt.toISOString(),
    estoque:              p.entradas.reduce((s, e) => s + e.quantidade, 0),
    estoqueVinculadoId:   p.estoqueVinculadoId ?? null,
  }))

  return <ProdutosClient produtos={produtos} />
}
