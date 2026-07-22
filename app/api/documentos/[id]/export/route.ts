import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { NextResponse } from 'next/server'
import { csvCell, paginaHtml, slugify, type CampoExtraido } from '@/lib/documento-export'

/**
 * GET /api/documentos/:id/export — baixa a planilha do documento.
 * `?formato=html` traz a FOTO anexada junto da planilha, num arquivo só;
 * sem o parâmetro, sai o CSV (dados puros, para abrir no Excel).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const doc = await prisma.documentoDigitalizado.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })

  const campos = (Array.isArray(doc.campos) ? doc.campos : []) as unknown as CampoExtraido[]
  const formato = new URL(req.url).searchParams.get('formato')

  if (formato === 'html') {
    return new NextResponse(paginaHtml({ ...doc, campos }), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${slugify(doc.nome)}.html"`,
        // O arquivo carrega a imagem embutida e nada mais; a CSP fecha a porta
        // para qualquer script caso um dia entre conteúdo inesperado nos campos.
        'Content-Security-Policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'",
      },
    })
  }

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
