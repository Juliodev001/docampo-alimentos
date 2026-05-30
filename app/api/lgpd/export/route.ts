import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const cpf = searchParams.get('cpf')?.replace(/\D/g, '')

  if (!cpf) return NextResponse.json({ error: 'CPF/CNPJ não informado.' }, { status: 400 })

  const resultado: Record<string, unknown> = {
    exportadoEm: new Date().toISOString(),
    cpfCnpj: cpf,
    dados: {},
  }

  // Buscar como Produtor
  const produtor = await prisma.produtor.findFirst({
    where: { cpf: { contains: cpf } },
    include: {
      parceiros: true,
      colheitas: {
        include: { produto: { select: { nome: true } } },
        orderBy: { data: 'desc' },
        take: 200,
      },
      fechamentos: { orderBy: { dataPagamento: 'desc' }, take: 50 },
    },
  })
  if (produtor) {
    resultado.dados = {
      ...resultado.dados as object,
      produtor: {
        id: produtor.id,
        nome: produtor.nome,
        cpf: produtor.cpf,
        telefone: produtor.telefone,
        cadastradoEm: produtor.createdAt,
        parceiros: produtor.parceiros.map((p) => ({ nome: p.nome, cpf: p.cpf, percentual: p.percentual })),
        totalColheitas: produtor.colheitas.length,
        totalFechamentos: produtor.fechamentos.length,
        colheitas: produtor.colheitas.map((c) => ({
          data: c.data,
          produto: c.produto.nome,
          qtdTotal: c.quantidadeTotal,
          preco: c.preco,
          descarte: c.descarte,
        })),
        fechamentos: produtor.fechamentos.map((f) => ({
          periodo: `${f.dataInicio.toISOString().split('T')[0]} a ${f.dataFim.toISOString().split('T')[0]}`,
          dataPagamento: f.dataPagamento,
          status: f.status,
        })),
      },
    }
  }

  // Buscar como Parceiro
  const parceiro = await prisma.parceiro.findFirst({
    where: { cpf: { contains: cpf } },
    include: { produtor: { select: { nome: true, cpf: true } } },
  })
  if (parceiro) {
    resultado.dados = {
      ...resultado.dados as object,
      parceiro: {
        nome: parceiro.nome,
        cpf: parceiro.cpf,
        percentual: parceiro.percentual,
        produtorAssociado: parceiro.produtor.nome,
        cadastradoEm: parceiro.createdAt,
      },
    }
  }

  // Buscar como Cliente
  const cliente = await prisma.cliente.findFirst({
    where: { cnpjCpf: { contains: cpf } },
    include: {
      romaneios: { select: { numero: true, data: true, totalValor: true, status: true }, orderBy: { data: 'desc' }, take: 100 },
      titulos: { select: { descricao: true, valor: true, dataVenc: true, status: true }, orderBy: { dataVenc: 'desc' }, take: 100 },
      nfes: { select: { numero: true, dataEmissao: true, totalValor: true, status: true }, orderBy: { dataEmissao: 'desc' }, take: 100 },
    },
  })
  if (cliente) {
    resultado.dados = {
      ...resultado.dados as object,
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        cnpjCpf: cliente.cnpjCpf,
        telefone: cliente.telefone,
        email: cliente.email,
        cadastradoEm: cliente.createdAt,
        totalRomaneios: cliente.romaneios.length,
        totalNFe: cliente.nfes.length,
        totalTitulos: cliente.titulos.length,
        romaneios: cliente.romaneios,
        nfes: cliente.nfes,
        titulos: cliente.titulos,
      },
    }
  }

  // Buscar como Fornecedor
  const fornecedor = await prisma.fornecedor.findFirst({
    where: { cnpjCpf: { contains: cpf } },
    select: { id: true, nome: true, cnpjCpf: true, telefone: true, email: true, createdAt: true, _count: { select: { compras: true } } },
  })
  if (fornecedor) {
    resultado.dados = {
      ...resultado.dados as object,
      fornecedor: {
        nome: fornecedor.nome,
        cnpjCpf: fornecedor.cnpjCpf,
        telefone: fornecedor.telefone,
        email: fornecedor.email,
        cadastradoEm: fornecedor.createdAt,
        totalCompras: fornecedor._count.compras,
      },
    }
  }

  const encontrado = Object.keys(resultado.dados as object).length > 0
  if (!encontrado) {
    return NextResponse.json({ error: 'Nenhum registro encontrado para este CPF/CNPJ.' }, { status: 404 })
  }

  const json = JSON.stringify(resultado, null, 2)
  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="lgpd-export-${cpf}.json"`,
    },
  })
}
