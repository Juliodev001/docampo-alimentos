import { describe, it, expect } from 'vitest'
import { extrairDanfe } from '@/lib/danfe-campos'
import { paginaCompleta } from './danfe-pagina-fixture'

describe('DANFE completa — página inteira', () => {
  const d = extrairDanfe(paginaCompleta())
  const valor = (campo: string) => d.campos.find((c) => c.campo === campo)?.valor

  it('identifica a nota pela chave de acesso', () => {
    expect(d.conferencia).toBe('dv')
    expect(valor('Chave de acesso')).toBe('3126 0719 4241 5900 0323 5500 2000 1906 9010 0530 2779')
    expect(valor('Número da nota')).toBe('190690')
    expect(valor('Série')).toBe('2')
    expect(valor('Modelo')).toBe('55 (NF-e)')
    expect(valor('UF do emitente')).toBe('MG')
    expect(valor('Competência (ano/mês)')).toBe('2026-07')
  })

  it('pega o emitente mesmo dividindo a linha com "DANFE"', () => {
    expect(valor('Emitente')).toBe('COOP REG DOS CAFEIC DO VALE DO RIO VERDE')
    expect(valor('CNPJ do emitente')).toBe('19.424.159/0003-23')
    expect(valor('CNPJ (emitente)')).toBe('19424159000323')
    expect(valor('Inscrição estadual (emitente)')).toBe('1410690370261')
  })

  it('lê endereço e município do emitente, que não têm rótulo na DANFE', () => {
    expect(valor('Endereço (emitente)')).toBe('RUA JOAO NOGUEIRA, 92 FUNDOS')
    expect(valor('Município (emitente)')).toBe('Carmo de Minas')
  })

  it('não emenda o CEP do emitente com o telefone nem com a linha de baixo', () => {
    expect(valor('CEP (emitente)')).toBe('37472000')
  })

  it('lê os dados do destinatário', () => {
    expect(valor('Nome / Razão social')).toBe('6169 - MARCOS HENRIQUE TAVEIRA')
    expect(valor('CNPJ / CPF')).toBe('11988807670')
    expect(valor('Endereço (destinatário)')).toBe('SITIO AGROPECUARIA NOVA CONQUISTA, 1')
    expect(valor('Bairro / Distrito (destinatário)')).toBe('SAO SEBASTIAO DO PAIOL')
    expect(valor('CEP (destinatário)')).toBe('37478000')
    expect(valor('Município (destinatário)')).toBe('Soledade de Minas')
    expect(valor('UF (destinatário)')).toBe('MG')
    expect(valor('Inscrição estadual (destinatário)')).toBe('0029982080016')
  })

  it('lê datas, hora, natureza da operação e protocolo', () => {
    expect(valor('Data da emissão')).toBe('21/07/2026')
    expect(valor('Data da entrada / saída')).toBe('21/07/2026')
    expect(valor('Hora da saída')).toBe('16:30')
    expect(valor('Natureza da operação')).toBe('Venda de merc. adq. ou recebida de terceiros-Loja')
    expect(valor('Protocolo de autorização')).toContain('131267743950589')
  })

  it('casa cada total com o rótulo acima, mesmo com o valor alinhado à direita', () => {
    expect(valor('Base de cálculo do ICMS')).toBe('0,00')
    expect(valor('Valor do ICMS')).toBe('0,00')
    expect(valor('Base de cálculo do ICMS ST')).toBe('0,00')
    expect(valor('Valor do ICMS substituição')).toBe('0,00')
    expect(valor('Valor total dos produtos')).toBe('391,00')
    expect(valor('Valor do frete')).toBe('0,00')
    expect(valor('Valor do seguro')).toBe('0,00')
    expect(valor('Desconto')).toBe('9,78')
    expect(valor('Outras despesas acessórias')).toBe('0,00')
    expect(valor('Valor total do IPI')).toBe('0,00')
    expect(valor('Valor total da nota')).toBe('381,22')
    expect(d.total).toBe(381.22)
  })

  it('lê a duplicata da fatura', () => {
    expect(valor('Duplicata 2-190690-1 — vencimento')).toBe('21/07/2026')
    expect(valor('Duplicata 2-190690-1 — valor')).toBe('381,22')
  })

  it('lê o quadro de transporte e volumes sem invadir a coluna vizinha', () => {
    expect(valor('Peso bruto')).toBe('0,000')
    expect(valor('Peso líquido')).toBe('0,000')
    expect(valor('Quantidade de volumes')).toBe('1')
    expect(valor('Frete por conta')).toBe('1 - DESTINATARIO')
    // Colunas vazias na nota não podem virar campo com o título da coluna
    // seguinte dentro — foi assim que "ESPÉCIE" já devolveu "MARCA NUMERO".
    expect(valor('Espécie dos volumes')).toBeUndefined()
    expect(valor('Marca dos volumes')).toBeUndefined()
    expect(valor('Código ANTT')).toBeUndefined()
  })

  it('deduz entrada/saída pelo CFOP e captura as informações complementares', () => {
    expect(valor('Tipo de operação')).toBe('Saída (CFOP 5160)')
    expect(valor('Informações complementares')).toContain('CARTAO DEBITO')
    expect(valor('Informações complementares')).toContain('MAYCON DOUGLAS')
  })

  it('lê o item com todas as colunas e junta a descrição quebrada', () => {
    expect(d.itens).toHaveLength(1)
    const item = d.itens[0]
    expect(item.codigo).toBe('4490')
    expect(item.ncm).toBe('38089291')
    expect(item.cst).toBe('040')
    expect(item.cfop).toBe('5160')
    expect(item.unidade).toBe('Kg')
    expect(item.quantidade).toBe('1,0000')
    expect(item.valorUnit).toBe('391,0000')
    expect(item.valorTotal).toBe('391,00')
    expect(item.descricao).toContain('TUTOR 5 KG BASF')
    expect(item.descricao).toContain('HIDROXIDO DE COBRE')
  })

  it('não inventa avisos: a nota fecha (391,00 − 9,78 = 381,22)', () => {
    expect(d.avisos).toEqual([])
  })
})
