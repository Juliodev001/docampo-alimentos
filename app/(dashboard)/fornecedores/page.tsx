import { prisma } from '@/lib/prisma'
import FornecedoresClient from './fornecedores-client'

export default async function FornecedoresPage() {
  const fornecedores = await prisma.fornecedor.findMany({
    orderBy: { nome: 'asc' },
    include: {
      _count: { select: { compras: true, nfes: true } },
      enderecos: true,
      contatos: true,
    },
  })

  return (
    <FornecedoresClient
      fornecedores={fornecedores.map(f => ({
        id: f.id,
        nome: f.nome,
        tipo: f.tipo,
        cnpjCpf: f.cnpjCpf,
        inscricaoEstadual: f.inscricaoEstadual,
        telefone: f.telefone,
        email: f.email,
        ativo: f.ativo,
        createdAt: f.createdAt.toISOString(),
        _count: f._count,
        enderecos: f.enderecos.map(e => ({
          id: e.id,
          cep: e.cep,
          logradouro: e.logradouro,
          numero: e.numero,
          complemento: e.complemento,
          bairro: e.bairro,
          cidade: e.cidade,
          estado: e.estado,
          referencia: e.referencia,
        })),
        contatos: f.contatos.map(c => ({
          id: c.id,
          telefone: c.telefone,
          email: c.email,
          nomeContato: c.nomeContato,
          observacao: c.observacao,
        })),
      }))}
    />
  )
}
