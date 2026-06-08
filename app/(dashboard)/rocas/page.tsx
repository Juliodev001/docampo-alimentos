import { prisma } from '@/lib/prisma'
import RocasClient from './rocas-client'

export default async function RocasPage() {
  const [rocas, produtores, colheitas, parceiros, produtos, pagamentosMeeiro, rawFechamentos, rawCustos] = await Promise.all([
    prisma.controleRoca.findMany({
      include: {
        produtor: true,
        registros: { orderBy: { data: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.produtor.findMany({
      orderBy: { nome: 'asc' },
      include: { parceiros: true },
    }),
    prisma.colheitaDiaria.findMany({
      include: {
        produto: { select: { nome: true, unidade: true } },
        produtor: { select: { nome: true } },
        roca: { select: { nome: true, codigo: true } },
        parceiro: { select: { nome: true, codigo: true } },
      },
      orderBy: { data: 'desc' },
    }),
    prisma.parceiro.findMany({
      include: { produtor: { select: { id: true, nome: true, codigo: true } } },
      orderBy: { nome: 'asc' },
    }),
    prisma.produto.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
      select: {
        id: true,
        nome: true,
        sku: true,
        unidade: true,
        preco: true,
        precoVenda: true,
        estoqueMinimo: true,
        estoqueMaximo: true,
      },
    }),
    prisma.pagamentoMeeiro.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.fechamentoPagamento.findMany({
      include: { produtor: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.lancamentoCusto.findMany({ orderBy: { data: 'desc' } }),
  ])

  return (
    <RocasClient
      rocas={rocas.map(r => ({
        id:             r.id,
        codigo:         r.codigo,
        nome:           r.nome,
        area:           r.area,
        localizacao:    r.localizacao,
        mudasPlantadas: r.mudasPlantadas,
        cultura:        r.cultura,
        status:         r.status,
        dataPlantio:    r.dataPlantio?.toISOString() ?? null,
        dataColheita:   r.dataColheita?.toISOString() ?? null,
        observacao:     r.observacao,
        createdAt:      r.createdAt.toISOString(),
        produtor:       r.produtor ? { id: r.produtor.id, nome: r.produtor.nome, codigo: r.produtor.codigo } : null,
        registros:      r.registros.map(reg => ({
          id:        reg.id,
          data:      reg.data.toISOString(),
          tipo:      reg.tipo,
          descricao: reg.descricao,
          custo:     Number(reg.custo),
        })),
      }))}
      produtores={produtores.map(p => ({
        id:                p.id,
        codigo:            p.codigo,
        nome:              p.nome,
        tipo:              p.tipo,
        cpf:               p.cpf,
        cnpj:              p.cnpj,
        inscricaoEstadual: p.inscricaoEstadual,
        telefone:          p.telefone,
        endereco:          p.endereco,
        parceiros:         p.parceiros.map(par => ({
          id:          par.id,
          codigo:      par.codigo,
          nome:        par.nome,
          nomeFantasia:par.nomeFantasia,
          cpf:         par.cpf,
          chavePix:    par.chavePix,
          percentual:  par.percentual,
          valorEmba:   Number(par.valorEmba),
          endereco:    par.endereco,
          telefone:    par.telefone,
        })),
      }))}
      colheitas={colheitas.map(c => ({
        id:              c.id,
        data:            c.data.toISOString(),
        rocaId:          c.rocaId,
        rocaNome:        c.roca?.nome ?? null,
        rocaCodigo:      c.roca?.codigo ?? null,
        produtoId:       c.produtoId,
        produtoNome:     c.produto.nome,
        produtorId:      c.produtorId,
        produtorNome:    c.produtor?.nome ?? null,
        parceiroId:      c.parceiroId,
        parceiroNome:    c.parceiro?.nome ?? null,
        parceiroCodigo:  c.parceiro?.codigo ?? null,
        quantidadeTotal: c.quantidadeTotal,
        preco:           Number(c.preco),
        percParceiro:    c.percParceiro,
        qualidade:       c.qualidade,
        nrDoc:           c.nrDoc,
      }))}
      parceiros={parceiros.map(p => ({
        id:          p.id,
        codigo:      p.codigo,
        nome:        p.nome,
        nomeFantasia:p.nomeFantasia,
        cpf:         p.cpf,
        chavePix:    p.chavePix,
        percentual:  p.percentual,
        valorEmba:   Number(p.valorEmba),
        endereco:    p.endereco,
        telefone:    p.telefone,
        produtorId:  p.produtorId,
        produtorNome:p.produtor.nome,
        produtorCodigo: p.produtor.codigo,
      }))}
      produtos={produtos.map(p => ({
        id:           p.id,
        nome:         p.nome,
        sku:          p.sku,
        unidade:      p.unidade,
        preco:        Number(p.preco),
        precoVenda:   Number(p.precoVenda),
        estoqueMinimo:p.estoqueMinimo,
        estoqueMaximo:p.estoqueMaximo,
      }))}
      pagamentosMeeiro={pagamentosMeeiro.map(pg => ({
        id:         pg.id,
        parceiroId: pg.parceiroId,
        valor:      Number(pg.valor),
        formaPag:   pg.formaPag,
        conta:      pg.conta,
        dataPag:    pg.dataPag.toISOString(),
        observacao: pg.observacao,
        status:     pg.status,
        createdAt:  pg.createdAt.toISOString(),
      }))}
      fechamentos={rawFechamentos.map(f => ({
        id:                 f.id,
        produtorId:         f.produtorId,
        produtorNome:       f.produtor.nome,
        dataInicio:         f.dataInicio.toISOString(),
        dataFim:            f.dataFim.toISOString(),
        dataPagamento:      f.dataPagamento.toISOString(),
        combustivel:        Number(f.combustivel),
        bandejaEmbalagem:   Number(f.bandejaEmbalagem),
        valesDinheiro:      Number(f.valesDinheiro),
        creditos:           Number(f.creditos),
        debitosAnteriores:  Number(f.debitosAnteriores),
        status:             f.status,
        createdAt:          f.createdAt.toISOString(),
      }))}
      custos={rawCustos.map(c => ({
        id:                c.id,
        produtorId:        c.produtorId,
        rocaId:            c.rocaId,
        data:              c.data.toISOString(),
        combustivel:       Number(c.combustivel),
        bandejaEmbalagem:  Number(c.bandejaEmbalagem),
        valesDinheiro:     Number(c.valesDinheiro),
        creditos:          Number(c.creditos),
        debitosAnteriores: Number(c.debitosAnteriores),
        observacao:        c.observacao,
        createdAt:         c.createdAt.toISOString(),
      }))}
    />
  )
}
