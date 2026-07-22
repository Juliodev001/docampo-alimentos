import { describe, it, expect } from 'vitest'
import {
  acharChave, calcularDvChave, cnpjsValidosNoTexto, decomporChave,
  validarChave, validarCnpj, validarCpf,
} from '@/lib/danfe-chave'
import { extrairDanfe, moedaParaNumero, pareceDanfe } from '@/lib/danfe-campos'
import { extrairDanfeDoXml, pareceXmlNfe } from '@/lib/danfe-xml'
import type { OcrWord } from '@/lib/ocr-parse'

/**
 * Dados da NF-e usada como referência (nota real do fornecedor COCARIVE):
 * nº 190.690, série 2, emitida em 21/07/2026 em MG, total R$ 381,22.
 */
const CHAVE = '31260719424159000323550020001906901005302779'
const CNPJ_EMITENTE = '19424159000323'
const CPF_DESTINATARIO = '11988807670'

/** Monta uma faixa horizontal de palavras distribuídas entre x0 e x1. */
function celula(texto: string, x0: number, x1: number, y: number, altura = 12): OcrWord[] {
  const partes = texto.split(' ').filter(Boolean)
  const largura = (x1 - x0) / partes.length
  return partes.map((t, i) => ({
    text: t,
    bbox: { x0: x0 + i * largura, y0: y, x1: x0 + (i + 1) * largura - 1, y1: y + altura },
  }))
}

describe('chave de acesso da NF-e', () => {
  it('valida o dígito verificador da chave real', () => {
    expect(calcularDvChave(CHAVE.slice(0, 43))).toBe(9)
    expect(validarChave(CHAVE)).toBe(true)
  })

  it('decompõe a chave nos campos que ela carrega', () => {
    const info = decomporChave(CHAVE)
    expect(info).not.toBeNull()
    expect(info!.uf).toBe('MG')
    expect(info!.competencia).toBe('2026-07')
    expect(info!.cnpjEmitente).toBe(CNPJ_EMITENTE)
    expect(info!.cnpjEmitenteOk).toBe(true)
    expect(info!.modeloNome).toBe('NF-e')
    expect(info!.serie).toBe('002')
    expect(info!.numero).toBe('190690')
    expect(info!.codigoNumerico).toBe('00530277')
  })

  it('rejeita a chave quando um dígito muda', () => {
    // Nenhum peso do módulo 11 é múltiplo de 11, então trocar UM dígito sempre
    // quebra a conta — é essa propriedade que faz o DV valer alguma coisa.
    for (let i = 0; i < 43; i++) {
      const outro = String((Number(CHAVE[i]) + 1) % 10)
      const corrompida = CHAVE.slice(0, i) + outro + CHAVE.slice(i + 1)
      expect(validarChave(corrompida)).toBe(false)
    }
  })

  it('acha a chave no meio do texto da página, em grupos de 4', () => {
    const texto = [
      'DANFE DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRONICA',
      'CHAVE DE ACESSO',
      '3126 0719 4241 5900 0323 5500 2000 1906 9010 0530 2779',
      'Consulta de autenticidade no portal nacional da NF-e',
    ].join('\n')

    const achado = acharChave(texto)
    expect(achado).not.toBeNull()
    expect(achado!.conferencia).toBe('dv')
    expect(achado!.info.numero).toBe('190690')
  })

  it('acha a chave mesmo quando o OCR a quebra em duas linhas', () => {
    const texto = '3126 0719 4241 5900 0323 5500\n2000 1906 9010 0530 2779'
    const achado = acharChave(texto)
    expect(achado?.info.chave).toBe(CHAVE)
  })

  it('aproveita a chave sem DV quando número, série e CNPJ conferem com a página', () => {
    // Dígito trocado dentro do código numérico (posição 35): o DV quebra, mas
    // número, série e CNPJ do emitente continuam íntegros na chave.
    const corrompida = CHAVE.slice(0, 35) + '1' + CHAVE.slice(36)
    expect(validarChave(corrompida)).toBe(false)

    const texto = corrompida.replace(/(\d{4})(?=\d)/g, '$1 ')
    expect(acharChave(texto)).toBeNull() // sem corroboração, não serve

    const achado = acharChave(texto, {
      numero: '000.190.690',
      serie: '002',
      cnpjsValidos: [CNPJ_EMITENTE],
    })
    expect(achado).not.toBeNull()
    expect(achado!.conferencia).toBe('campos')
    expect(achado!.info.numero).toBe('190690')
  })

  it('não aproveita a chave quando o número impresso diverge', () => {
    const corrompida = CHAVE.slice(0, 35) + '1' + CHAVE.slice(36)
    const texto = corrompida.replace(/(\d{4})(?=\d)/g, '$1 ')
    const achado = acharChave(texto, {
      numero: '000.190.111',
      serie: '002',
      cnpjsValidos: [CNPJ_EMITENTE],
    })
    expect(achado).toBeNull()
  })

  it('confere os dígitos de CNPJ e CPF', () => {
    expect(validarCnpj(CNPJ_EMITENTE)).toBe(true)
    expect(validarCnpj('19424159000324')).toBe(false)
    expect(validarCnpj('00000000000000')).toBe(false)
    expect(validarCpf(CPF_DESTINATARIO)).toBe(true)
    expect(validarCpf('11988807671')).toBe(false)
  })

  it('lista os CNPJs válidos que aparecem na página', () => {
    const texto = 'CNPJ 19.424.159/0003-23\nCNPJ 11.111.111/1111-11'
    expect(cnpjsValidosNoTexto(texto)).toContain(CNPJ_EMITENTE)
    expect(cnpjsValidosNoTexto(texto)).toHaveLength(1)
  })
})

describe('leitura da grade da DANFE', () => {
  /** Página sintética com a faixa de totais no layout real (rótulo em cima). */
  function paginaDeTotais(): OcrWord[] {
    return [
      ...celula('DANFE DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRONICA', 0, 400, 0),
      ...celula('CHAVE DE ACESSO', 0, 200, 20),
      ...celula('3126 0719 4241 5900 0323 5500 2000 1906 9010 0530 2779', 0, 600, 40),
      ...celula('N.º 000.190.690 SÉRIE 002', 0, 300, 60),
      // Linha de rótulos
      ...celula('BASE DE CALCULO DO ICMS', 0, 200, 100),
      ...celula('VALOR DO ICMS', 220, 380, 100),
      ...celula('VALOR TOTAL DOS PRODUTOS', 400, 600, 100),
      ...celula('VALOR TOTAL DA NOTA', 620, 800, 100),
      // Linha de valores, cada um sob o seu rótulo
      ...celula('0,00', 150, 190, 130),
      ...celula('1,50', 330, 370, 130),
      ...celula('391,00', 540, 590, 130),
      ...celula('381,22', 750, 795, 130),
    ]
  }

  it('reconhece a página como DANFE', () => {
    const texto = [
      'DANFE DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRONICA',
      'CHAVE DE ACESSO 3126 0719 4241 5900 0323 5500 2000 1906 9010 0530 2779',
      'NATUREZA DA OPERACAO',
    ].join('\n')
    expect(pareceDanfe(texto)).toBe(true)
    expect(pareceDanfe('Lista de compras\nTomate 3,00\nCebola 2,50')).toBe(false)
  })

  it('casa cada valor com o rótulo que está acima dele', () => {
    const d = extrairDanfe(paginaDeTotais())
    const valor = (campo: string) => d.campos.find((c) => c.campo === campo)?.valor

    expect(valor('Base de cálculo do ICMS')).toBe('0,00')
    expect(valor('Valor do ICMS')).toBe('1,50')
    expect(valor('Valor total dos produtos')).toBe('391,00')
    expect(valor('Valor total da nota')).toBe('381,22')
    expect(d.total).toBe(381.22)
  })

  it('tira número, série e emitente da chave conferida', () => {
    const d = extrairDanfe(paginaDeTotais())
    expect(d.conferencia).toBe('dv')
    expect(d.chave?.numero).toBe('190690')
    const valor = (campo: string) => d.campos.find((c) => c.campo === campo)?.valor
    expect(valor('Número da nota')).toBe('190690')
    expect(valor('Série')).toBe('2')
    expect(valor('CNPJ do emitente')).toBe('19.424.159/0003-23')
  })

  it('remonta a vírgula decimal que o OCR comeu', () => {
    // Numa foto, a vírgula é dos primeiros caracteres a se perder: "391,00"
    // chega como "39100" e "381,22" como "38122". Sem remontar, os campos de
    // valor ficavam vazios e o total da nota sumia da planilha.
    const pagina: OcrWord[] = [
      ...celula('DANFE CHAVE DE ACESSO', 0, 300, 0),
      ...celula('3126 0719 4241 5900 0323 5500 2000 1906 9010 0530 2779', 0, 600, 30),
      ...celula('VALOR TOTAL DOS PRODUTOS', 0, 200, 100),
      ...celula('DESCONTO', 220, 380, 100),
      ...celula('VALOR TOTAL DA NOTA', 400, 600, 100),
      ...celula('39100', 150, 190, 130),
      ...celula('978', 330, 370, 130),
      ...celula('38122', 540, 590, 130),
    ]
    const d = extrairDanfe(pagina)
    const valor = (campo: string) => d.campos.find((c) => c.campo === campo)?.valor

    expect(valor('Valor total dos produtos')).toBe('391,00')
    expect(valor('Desconto')).toBe('9,78')
    expect(valor('Valor total da nota')).toBe('381,22')
    expect(d.total).toBe(381.22)
    // 391,00 − 9,78 = 381,22: a conta fecha, o que confirma a remontagem.
    expect(d.avisos.some((a) => /a soma da nota fecha/.test(a))).toBe(true)
    expect(d.avisos.some((a) => /não bate/.test(a))).toBe(false)
  })

  it('avisa quando o total não bate com os produtos', () => {
    const d = extrairDanfe(paginaDeTotais())
    // 391,00 de produtos, sem desconto declarado, mas total de 381,22.
    expect(d.avisos.some((a) => /não bate/.test(a))).toBe(true)
  })

  it('lê a tabela de itens pelas colunas do cabeçalho', () => {
    // Cada título de coluna entra com o seu x0 real: são eles que definem as
    // faixas em que as linhas seguintes serão fatiadas.
    const cabecalho: OcrWord[] = [
      ...celula('COD.', 0, 50, 200),
      ...celula('DESCRICAO DO PRODUTO / SERVICO', 60, 290, 200),
      ...celula('NCM/SH', 300, 370, 200),
      ...celula('CFOP', 380, 430, 200),
      ...celula('UNIDADE', 440, 510, 200),
      ...celula('QUANTIDADE', 520, 610, 200),
      ...celula('V. UNITARIO', 620, 710, 200),
      ...celula('VALOR TOTAL', 720, 810, 200),
    ]
    const linhaItem: OcrWord[] = [
      ...celula('4490', 0, 40, 230),
      ...celula('TUTOR 5 KG BASF', 60, 170, 230),
      ...celula('38089291', 300, 360, 230),
      ...celula('5160', 380, 420, 230),
      ...celula('Kg', 440, 470, 230),
      ...celula('1,0000', 520, 560, 230),
      ...celula('391,0000', 620, 660, 230),
      ...celula('391,00', 720, 770, 230),
    ]

    const d = extrairDanfe([...cabecalho, ...linhaItem])
    expect(d.itens).toHaveLength(1)
    const item = d.itens[0]
    expect(item.codigo).toBe('4490')
    expect(item.descricao).toBe('TUTOR 5 KG BASF')
    expect(item.ncm).toBe('38089291')
    expect(item.cfop).toBe('5160')
    expect(item.unidade).toBe('Kg')
    expect(item.quantidade).toBe('1,0000')
    expect(item.valorTotal).toBe('391,00')
  })
})

describe('importação do XML da NF-e', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe${CHAVE}" versao="4.00">
      <ide>
        <cUF>31</cUF><natOp>Venda de merc. adq. ou recebida de terceiros-Loja</natOp>
        <mod>55</mod><serie>2</serie><nNF>190690</nNF>
        <dhEmi>2026-07-21T16:30:00-03:00</dhEmi>
        <dhSaiEnt>2026-07-21T16:30:00-03:00</dhSaiEnt>
      </ide>
      <emit>
        <CNPJ>${CNPJ_EMITENTE}</CNPJ>
        <xNome>COOP REG DOS CAFEIC DO VALE DO RIO VERDE</xNome>
        <IE>1410690370261</IE>
        <enderEmit>
          <xLgr>RUA JOAO NOGUEIRA</xLgr><nro>92</nro>
          <xMun>Carmo de Minas</xMun><UF>MG</UF><CEP>37472000</CEP>
        </enderEmit>
      </emit>
      <dest>
        <CPF>${CPF_DESTINATARIO}</CPF>
        <xNome>MARCOS HENRIQUE TAVEIRA</xNome>
        <IE>0029982080016</IE>
        <enderDest>
          <xLgr>SITIO AGROPECUARIA NOVA CONQUISTA</xLgr><nro>1</nro>
          <xBairro>SAO SEBASTIAO DO PAIOL</xBairro>
          <xMun>Soledade de Minas</xMun><UF>MG</UF><CEP>37478000</CEP>
        </enderDest>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>4490</cProd><xProd>TUTOR 5 KG BASF</xProd>
          <NCM>38089291</NCM><CFOP>5160</CFOP>
          <uCom>Kg</uCom><qCom>1.0000</qCom>
          <vUnCom>391.0000</vUnCom><vProd>391.00</vProd>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vBC>0.00</vBC><vICMS>0.00</vICMS><vBCST>0.00</vBCST><vST>0.00</vST>
          <vProd>391.00</vProd><vFrete>0.00</vFrete><vSeg>0.00</vSeg>
          <vDesc>9.78</vDesc><vOutro>0.00</vOutro><vIPI>0.00</vIPI>
          <vNF>381.22</vNF>
        </ICMSTot>
      </total>
      <cobr>
        <dup><nDup>2-190690-1</nDup><dVenc>2026-07-21</dVenc><vDup>381.22</vDup></dup>
      </cobr>
    </infNFe>
  </NFe>
  <protNFe><infProt><nProt>131267743950589</nProt><dhRecbto>2026-07-21T16:30:06-03:00</dhRecbto></infProt></protNFe>
</nfeProc>`

  it('reconhece o arquivo como XML de NF-e', () => {
    expect(pareceXmlNfe(xml)).toBe(true)
    expect(pareceXmlNfe('<html><body>oi</body></html>')).toBe(false)
  })

  it('extrai os campos da nota sem passar por OCR', () => {
    const d = extrairDanfeDoXml(xml)
    expect(d).not.toBeNull()
    const valor = (campo: string) => d!.campos.find((c) => c.campo === campo)?.valor

    expect(d!.conferencia).toBe('dv')
    expect(d!.chave?.chave).toBe(CHAVE)
    expect(valor('Emitente')).toBe('COOP REG DOS CAFEIC DO VALE DO RIO VERDE')
    expect(valor('Número da nota')).toBe('190690')
    expect(valor('Série')).toBe('2')
    expect(valor('Data da emissão')).toBe('21/07/2026')
    expect(valor('Hora da saída')).toBe('16:30')
    expect(valor('Nome / Razão social')).toBe('MARCOS HENRIQUE TAVEIRA')
    expect(valor('CNPJ / CPF')).toBe('119.888.076-70')
    expect(valor('Valor total dos produtos')).toBe('391,00')
    expect(valor('Desconto')).toBe('9,78')
    expect(valor('Valor total da nota')).toBe('381,22')
    expect(valor('Duplicata 2-190690-1 — vencimento')).toBe('21/07/2026')
    expect(d!.total).toBe(381.22)
  })

  it('traz o item com NCM, CFOP e quantidade', () => {
    const d = extrairDanfeDoXml(xml)!
    expect(d.itens).toHaveLength(1)
    expect(d.itens[0]).toMatchObject({
      codigo: '4490',
      descricao: 'TUTOR 5 KG BASF',
      ncm: '38089291',
      cfop: '5160',
      unidade: 'Kg',
      quantidade: '1',
      valorTotal: '391,00',
    })
  })

  it('não confunde a soma dos itens com o total (nota tem desconto)', () => {
    const d = extrairDanfeDoXml(xml)!
    // 391,00 de produtos com 9,78 de desconto = 381,22. Nada a avisar.
    expect(d.avisos).toHaveLength(0)
  })

  it('devolve null para XML que não é NF-e', () => {
    expect(extrairDanfeDoXml('<foo><bar/></foo>')).toBeNull()
  })
})

describe('conversão de valores', () => {
  it('lê moeda pt-BR', () => {
    expect(moedaParaNumero('1.234,56')).toBe(1234.56)
    expect(moedaParaNumero('381,22')).toBe(381.22)
    expect(moedaParaNumero('0,00')).toBe(0)
    expect(moedaParaNumero('21/07/2026')).toBeNull()
    expect(moedaParaNumero('38089291')).toBeNull()
  })
})
