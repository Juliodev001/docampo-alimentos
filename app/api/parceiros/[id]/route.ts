import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { memCache } from '@/lib/mem-cache'

// `/api/produtores` responde de um cache de 60s que traz os meeiros junto
// (`include: { parceiros: true }`). Sem derrubar esse cache aqui, renomear um
// meeiro continuava mostrando o nome velho por até um minuto em toda tela que
// lê produtores — inclusive nas que geram recibo.
const KEY_PRODUTORES = 'produtores'

/** Movimento vinculado ao meeiro — o que a exclusão levaria junto. */
async function contarMovimento(id: string) {
  const [colheitas, pagamentos, vales, fechamentos] = await Promise.all([
    prisma.colheitaDiaria.count({ where: { parceiroId: id } }),
    prisma.pagamentoMeeiro.count({ where: { parceiroId: id } }),
    prisma.vale.count({ where: { parceiroId: id } }),
    prisma.fechamentoMeeiro.count({ where: { parceiroId: id } }),
  ])
  return { colheitas, pagamentos, vales, fechamentos, total: colheitas + pagamentos + vales + fechamentos }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const parceiro = await prisma.parceiro.findUnique({
    where: { id },
    include: { produtor: { select: { id: true, nome: true, codigo: true } } },
  })
  if (!parceiro) return NextResponse.json({ error: 'Meeiro não encontrado.' }, { status: 404 })

  return NextResponse.json({ ...parceiro, movimento: await contarMovimento(id) })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { nome, nomeFantasia, cpf, chavePix, percentual, valorEmba, endereco, telefone, produtorId } = body

  if (!nome) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })

  const existing = await prisma.parceiro.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Meeiro não encontrado.' }, { status: 404 })

  // `codigo` é único: só vale trocar depois de conferir que ninguém mais usa.
  const codigo = typeof body.codigo === 'string' ? body.codigo.trim() || null : undefined
  if (codigo && codigo !== existing.codigo) {
    const conflict = await prisma.parceiro.findUnique({ where: { codigo } })
    if (conflict) return NextResponse.json({ error: 'Código já cadastrado por outro meeiro.' }, { status: 400 })
  }

  try {
    const parceiro = await prisma.parceiro.update({
      where: { id },
      data: {
        nome,
        nomeFantasia: nomeFantasia || null,
        cpf: cpf || null,
        chavePix: chavePix || null,
        percentual: percentual ?? 0,
        valorEmba: valorEmba ?? 0,
        endereco: endereco || null,
        telefone: telefone || null,
        ...(codigo !== undefined && { codigo }),
        ...(produtorId && { produtorId }),
      },
      include: { produtor: { select: { id: true, nome: true, codigo: true } } },
    })
    memCache.invalidate(KEY_PRODUTORES)
    return NextResponse.json(parceiro)
  } catch (e) {
    console.error('Erro ao atualizar meeiro:', e)
    return NextResponse.json({ error: 'Erro ao atualizar meeiro.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const parceiro = await prisma.parceiro.findUnique({ where: { id }, select: { nome: true } })
  if (!parceiro) return NextResponse.json({ error: 'Meeiro não encontrado.' }, { status: 404 })

  const movimento = await contarMovimento(id)
  const forcar = req.nextUrl.searchParams.get('force') === 'true'

  // Sem `force`, meeiro com movimento não é apagado: devolve o que seria
  // perdido para quem chamou decidir. Antes o banco barrava por causa do
  // FechamentoMeeiro e a tela mostrava só "erro ao excluir".
  if (movimento.total > 0 && !forcar)
    return NextResponse.json(
      { error: `O meeiro "${parceiro.nome}" tem lançamentos registrados.`, movimento },
      { status: 409 },
    )

  try {
    await prisma.$transaction(async (tx) => {
      // As colheitas são o registro de produção da roça e sobrevivem ao meeiro,
      // apenas sem o vínculo. O resto (pagamentos, vales, fechamentos) só existe
      // em função dele e vai junto — nesta ordem, para não esbarrar nas FKs.
      await tx.pagamentoMeeiro.deleteMany({ where: { parceiroId: id } })
      await tx.vale.deleteMany({ where: { parceiroId: id } })
      await tx.fechamentoMeeiro.deleteMany({ where: { parceiroId: id } })
      await tx.colheitaDiaria.updateMany({ where: { parceiroId: id }, data: { parceiroId: null } })
      await tx.parceiro.delete({ where: { id } })
    })
    memCache.invalidate(KEY_PRODUTORES)
    return NextResponse.json({ ok: true, movimento })
  } catch (e) {
    console.error('Erro ao excluir meeiro:', e)
    return NextResponse.json({ error: 'Erro ao excluir meeiro.' }, { status: 500 })
  }
}
