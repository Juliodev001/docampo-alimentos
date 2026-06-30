import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

const SENHA_ZERAR_ESTOQUE = 'docampodocampo26'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { senha } = await req.json()
  if (senha !== SENHA_ZERAR_ESTOQUE) {
    return NextResponse.json({ error: 'Senha incorreta.' }, { status: 403 })
  }

  const produtos = await prisma.produto.findMany({
    select: { id: true, entradas: { select: { quantidade: true } } },
  })

  const ajustes = produtos
    .map(p => ({ produtoId: p.id, saldo: p.entradas.reduce((s, e) => s + e.quantidade, 0) }))
    .filter(p => p.saldo !== 0)

  await prisma.$transaction(
    ajustes.map(a => prisma.entradaEstoque.create({
      data: {
        produtoId: a.produtoId,
        quantidade: -a.saldo,
        valorUnit: 0,
        observacao: 'Zerar estoque (ajuste administrativo)',
      },
    }))
  )

  return NextResponse.json({ ok: true, produtosZerados: ajustes.length })
}
