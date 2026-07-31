import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { memCache } from '@/lib/mem-cache'

const KEY = 'produtores'

type ParceiroInput = { id?: string; nome: string; cpf?: string; percentual: number }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const produtor = await prisma.produtor.findUnique({
    where: { id },
    include: { parceiros: { orderBy: { createdAt: 'asc' } } },
  })
  if (!produtor) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
  return NextResponse.json(produtor)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json() as {
    codigo?: string; nome: string; tipo?: string
    cpf?: string; cnpj?: string; inscricaoEstadual?: string
    telefone?: string; endereco?: string; parceiros?: ParceiroInput[]
  }

  const { nome, tipo, cpf, cnpj, inscricaoEstadual, telefone, endereco, parceiros } = body
  if (parceiros && parceiros.reduce((s: number, p: ParceiroInput) => s + p.percentual, 0) > 100)
    return NextResponse.json({ error: 'Soma das porcentagens não pode ultrapassar 100%.' }, { status: 400 })

  const existing = await prisma.produtor.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Produtor não encontrado.' }, { status: 404 })

  if (cpf && cpf !== existing.cpf) {
    const conflict = await prisma.produtor.findUnique({ where: { cpf } })
    if (conflict) return NextResponse.json({ error: 'CPF já cadastrado por outro produtor.' }, { status: 400 })
  }

  if (body.codigo && body.codigo !== existing.codigo) {
    const conflict = await prisma.produtor.findUnique({ where: { codigo: body.codigo } })
    if (conflict) return NextResponse.json({ error: 'Código já utilizado por outro produtor.' }, { status: 400 })
  }

  const data = {
    codigo:           body.codigo || existing.codigo,
    nome,
    tipo:             tipo || 'FISICA',
    cpf:              cpf || null,
    cnpj:             cnpj || null,
    inscricaoEstadual:inscricaoEstadual || null,
    telefone:         telefone || null,
    endereco:         endereco || null,
  }

  // A lista de meeiros só é sincronizada quando o cliente realmente a envia.
  // Telas que editam apenas os dados do produtor (ex.: Controle de Roça) mandam
  // o payload sem `parceiros` — tratar isso como "lista vazia" apagava todos os
  // meeiros do produtor junto com pagamentos e vínculos de colheita.
  const atuais = parceiros
    ? await prisma.parceiro.findMany({ where: { produtorId: id }, select: { id: true, nome: true } })
    : []
  // Só conta como "mantido" o id que realmente pertence a este produtor; um id
  // desconhecido cai no caminho de criação em vez de editar meeiro alheio.
  const idsAtuais = new Set(atuais.map((p) => p.id))
  const mantidos = new Set(
    (parceiros ?? [])
      .map((p) => p.id)
      .filter((pid): pid is string => !!pid && idsAtuais.has(pid)),
  )
  const removidos = atuais.filter((p) => !mantidos.has(p.id))

  // Remover um meeiro que já tem movimento destruiria histórico: colheitas e
  // vales ficariam órfãos e os pagamentos seriam apagados em cascata.
  for (const r of removidos) {
    const [colheitas, pagamentos, vales, fechamentos] = await Promise.all([
      prisma.colheitaDiaria.count({ where: { parceiroId: r.id } }),
      prisma.pagamentoMeeiro.count({ where: { parceiroId: r.id } }),
      prisma.vale.count({ where: { parceiroId: r.id } }),
      prisma.fechamentoMeeiro.count({ where: { parceiroId: r.id } }),
    ])
    if (colheitas + pagamentos + vales + fechamentos > 0)
      return NextResponse.json(
        { error: `O meeiro "${r.nome}" tem lançamentos registrados e não pode ser removido.` },
        { status: 400 },
      )
  }

  try {
    const produtor = await prisma.$transaction(async (tx) => {
      await tx.produtor.update({ where: { id }, data })

      if (parceiros) {
        for (const p of parceiros) {
          if (p.id && mantidos.has(p.id)) {
            await tx.parceiro.update({
              where: { id: p.id },
              data: { nome: p.nome, percentual: p.percentual, cpf: p.cpf || null },
            })
          } else {
            await tx.parceiro.create({
              data: { produtorId: id, nome: p.nome, percentual: p.percentual, cpf: p.cpf || null },
            })
          }
        }
        if (removidos.length > 0)
          await tx.parceiro.deleteMany({ where: { id: { in: removidos.map((r) => r.id) } } })
      }

      return tx.produtor.findUnique({ where: { id }, include: { parceiros: true } })
    })
    memCache.invalidate(KEY)
    return NextResponse.json(produtor)
  } catch (e) {
    console.error('Erro ao atualizar produtor:', e)
    return NextResponse.json({ error: 'Erro interno ao salvar. Verifique os dados.' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    await prisma.colheitaDiaria.updateMany({ where: { produtorId: id }, data: { produtorId: null } })
    await prisma.fechamentoPagamento.deleteMany({ where: { produtorId: id } })
    await prisma.produtor.delete({ where: { id } })
    memCache.invalidate(KEY)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Erro ao excluir produtor:', e)
    return NextResponse.json({ error: 'Erro ao excluir produtor.' }, { status: 500 })
  }
}
