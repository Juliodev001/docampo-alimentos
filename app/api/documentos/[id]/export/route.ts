import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { NextResponse } from 'next/server'

type CampoExtraido = { campo: string; valor: string }

/** Escapa um campo para CSV (aspas duplas + separador ponto-e-vírgula, padrão pt-BR/Excel). */
function csvCell(v: string): string {
  const s = String(v ?? '')
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Slug de arquivo sem acentos nem caracteres especiais. */
function slugify(nome: string): string {
  return (
    nome
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // remove marcas de acento
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'documento'
  )
}

/** GET /api/documentos/:id/export — baixa a planilha (CSV) do documento. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const doc = await prisma.documentoDigitalizado.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })

  const campos = (Array.isArray(doc.campos) ? doc.campos : []) as unknown as CampoExtraido[]

  const linhas = [['Campo', 'Valor'], ...campos.map((c) => [c.campo, c.valor])]
  // BOM (﻿) faz o Excel abrir em UTF-8 e mostrar os acentos corretamente.
  const csv = '﻿' + linhas.map((l) => l.map(csvCell).join(';')).join('\r\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slugify(doc.nome)}.csv"`,
    },
  })
}
