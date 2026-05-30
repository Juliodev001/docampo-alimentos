import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const clientes = await prisma.cliente.findMany({
    orderBy: { nome: 'asc' },
    include: {
      _count: { select: { nfes: true, romaneios: true } },
      enderecos: true,
      contatos: true,
    },
  })
  return NextResponse.json(clientes)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { nome, tipo, cnpjCpf, inscricaoEstadual, ativo, enderecos, contatos } = await req.json()
  if (!nome?.trim()) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })

  const primeiroContato = contatos?.[0]

  const cliente = await prisma.cliente.create({
    data: {
      nome: nome.trim(),
      tipo: tipo ?? 'FISICA',
      cnpjCpf: cnpjCpf || null,
      inscricaoEstadual: inscricaoEstadual || null,
      telefone: primeiroContato?.telefone || null,
      email: primeiroContato?.email || null,
      enderecos: enderecos?.length
        ? {
            create: enderecos.map((e: {
              cep?: string; logradouro?: string; numero?: string; complemento?: string;
              bairro?: string; cidade?: string; estado?: string; referencia?: string
            }) => ({
              cep: e.cep || null, logradouro: e.logradouro || null,
              numero: e.numero || null, complemento: e.complemento || null,
              bairro: e.bairro || null, cidade: e.cidade || null,
              estado: e.estado || null, referencia: e.referencia || null,
            })),
          }
        : undefined,
      contatos: contatos?.length
        ? {
            create: contatos.map((c: {
              telefone?: string; email?: string; nomeContato?: string; observacao?: string
            }) => ({
              telefone: c.telefone || null, email: c.email || null,
              nomeContato: c.nomeContato || null, observacao: c.observacao || null,
            })),
          }
        : undefined,
    },
    include: {
      _count: { select: { nfes: true, romaneios: true } },
      enderecos: true,
      contatos: true,
    },
  })

  return NextResponse.json(cliente, { status: 201 })
}
