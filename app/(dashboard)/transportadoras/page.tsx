import { prisma } from '@/lib/prisma'
import TransportadorasClient from './transportadoras-client'

export default async function TransportadorasPage() {
  const transportadoras = await prisma.transportadora.findMany({
    orderBy: { nome: 'asc' },
    include: { _count: { select: { pedidos: true } } },
  })
  return (
    <TransportadorasClient
      transportadoras={transportadoras.map(t => ({
        id:                t.id,
        nome:              t.nome,
        nomeFantasia:      t.nomeFantasia,
        cnpj:              t.cnpj,
        inscricaoEstadual: t.inscricaoEstadual,
        telefone:          t.telefone,
        email:             t.email,
        contato:           t.contato,
        cep:               t.cep,
        logradouro:        t.logradouro,
        numero:            t.numero,
        complemento:       t.complemento,
        bairro:            t.bairro,
        cidade:            t.cidade,
        estado:            t.estado,
        observacao:        t.observacao,
        ativo:             t.ativo,
        createdAt:         t.createdAt.toISOString(),
        _count:            t._count,
      }))}
    />
  )
}
