import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

/** GET /api/documentos — lista os documentos digitalizados (sem a imagem, para ficar leve). */
export async function GET() {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const docs = await prisma.documentoDigitalizado.findMany({
    orderBy: { criadoEm: 'desc' },
    select: {
      id: true,
      nome: true,
      campos: true,
      total: true,
      criadoEm: true,
    },
  })

  return NextResponse.json(docs)
}

type CampoExtraido = { campo: string; valor: string }

/** POST /api/documentos — salva um documento lido pelo OCR. */
export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    nome?: string
    imagem?: string
    textoBruto?: string
    campos?: CampoExtraido[]
    total?: number | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const nome = (body.nome ?? '').trim()
  if (!nome) return NextResponse.json({ error: 'Informe um nome para o documento.' }, { status: 400 })

  // Sanitiza os campos: só aceita pares com rótulo, ignora linhas vazias.
  const campos: CampoExtraido[] = Array.isArray(body.campos)
    ? body.campos
        .filter((c) => c && typeof c.campo === 'string' && c.campo.trim() !== '')
        .map((c) => ({ campo: String(c.campo).trim(), valor: String(c.valor ?? '').trim() }))
    : []

  const doc = await prisma.documentoDigitalizado.create({
    data: {
      nome,
      imagem: typeof body.imagem === 'string' ? body.imagem : null,
      textoBruto: typeof body.textoBruto === 'string' ? body.textoBruto : null,
      campos,
      total: body.total != null && Number.isFinite(body.total) ? body.total : null,
      userId: session.userId,
    },
    select: { id: true, nome: true, criadoEm: true },
  })

  return NextResponse.json(doc, { status: 201 })
}
