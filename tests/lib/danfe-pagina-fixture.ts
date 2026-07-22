import type { OcrWord } from '@/lib/ocr-parse'

/**
 * Página INTEIRA de uma DANFE real, reconstruída com as coordenadas do papel.
 *
 * Serve de fixture para os testes de extração. O que ela reproduz — e que os
 * testes de campo isolado não pegam — é justamente onde a leitura quebra:
 *  - rótulo miúdo encostado à esquerda da célula e valor grande alinhado à
 *    DIREITA, muitas vezes além de onde o texto do rótulo termina;
 *  - o nome do emitente dividindo linha visual com a palavra "DANFE";
 *  - rótulos repetidos nos blocos de emitente, destinatário e transportador;
 *  - o quadro de itens com 13 colunas, quatro delas depois do valor total;
 *  - a descrição do produto quebrada em linhas que transbordam a coluna;
 *  - "NATUREZA DE OPERAÇÃO", como este emitente imprime (o modelo diz "DA").
 *
 * Nota de referência: COCARIVE → Marcos Henrique Taveira, NF-e 190.690 série 2,
 * emitida em 21/07/2026, R$ 391,00 de produtos, R$ 9,78 de desconto, R$ 381,22.
 */

const LARG_CHAR = 6
const ALTURA = 12

/** Texto começando em x0 (rótulos e campos alinhados à esquerda). */
export function esq(t: string, x0: number, y: number): OcrWord[] {
  const palavras: OcrWord[] = []
  let x = x0
  for (const p of t.split(' ').filter(Boolean)) {
    const w = p.length * LARG_CHAR
    palavras.push({ text: p, bbox: { x0: x, y0: y, x1: x + w, y1: y + ALTURA } })
    x += w + LARG_CHAR
  }
  return palavras
}

/** Texto terminando em x1 (valores numéricos, alinhados à direita da célula). */
export function dir(t: string, x1: number, y: number): OcrWord[] {
  const largura = t
    .split(' ')
    .filter(Boolean)
    .reduce((acc, p) => acc + p.length * LARG_CHAR + LARG_CHAR, -LARG_CHAR)
  return esq(t, x1 - largura, y)
}

export function paginaCompleta(): OcrWord[] {
  return [
    // ── Canhoto ────────────────────────────────────────────────────────────
    ...esq('RECEBEMOS DE COOP REG DOS CAFEIC DO VALE DO RIO VERDE OS PRODUTOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO', 70, 0),
    ...esq('NF-e', 900, 0),
    ...esq('DATA DE RECEBIMENTO', 70, 25),
    ...esq('IDENTIFICACAO E ASSINATURA DO RECEBEDOR', 300, 25),
    ...esq('N.º 000.190.690', 890, 25),
    ...esq('SÉRIE 002', 890, 45),

    // ── Cabeçalho do emitente (nome divide a linha com "DANFE") ────────────
    ...esq('COOP REG DOS CAFEIC DO VALE DO RIO VERDE', 70, 80),
    ...esq('DANFE', 560, 80),
    ...esq('RUA JOAO NOGUEIRA, 92 FUNDOS', 200, 105),
    ...esq('DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRONICA', 540, 105),
    ...esq('Carmo de Minas/MG', 200, 130),
    ...esq('0 - ENTRADA 1 - SAIDA', 540, 130),
    ...esq('CHAVE DE ACESSO', 660, 130),
    ...esq('CEP: 37472-000 Fone: 35-9880-23337', 200, 155),
    ...esq('3126 0719 4241 5900 0323 5500 2000 1906 9010 0530 2779', 660, 155),
    ...esq('compra@cocarive.com.br', 200, 180),
    ...esq('N.º 000.190.690', 540, 180),
    ...esq('Consulta de autenticidade no portal nacional da NF-e', 660, 180),
    ...esq('www.cocarive.com.br', 200, 205),
    ...esq('SÉRIE 002', 540, 205),
    ...esq('www.nfe.fazenda.gov.br/portal ou no site da Sefaz', 660, 205),
    ...esq('FOLHA 1/ 1', 540, 230),

    // ── Natureza da operação / protocolo ───────────────────────────────────
    ...esq('NATUREZA DE OPERACAO', 70, 265),
    ...esq('PROTOCOLO DE AUTORIZACAO DE USO', 655, 265),
    ...esq('Venda de merc. adq. ou recebida de terceiros-Loja', 75, 285),
    ...esq('131267743950589 21/07/2026 16:30:06', 690, 285),

    // ── Inscrições do emitente ─────────────────────────────────────────────
    ...esq('INSCRICAO ESTADUAL', 70, 320),
    ...esq('INSC. ESTADUAL DO SUBST. TRIBUTARIO', 390, 320),
    ...esq('CNPJ', 745, 320),
    ...esq('1410690370261', 75, 340),
    ...esq('19424159000323', 750, 340),

    // ── Destinatário ───────────────────────────────────────────────────────
    ...esq('DESTINATARIO/REMETENTE', 70, 375),
    ...esq('NOME / RAZAO SOCIAL', 70, 400),
    ...esq('CNPJ/CPF', 675, 400),
    ...esq('DATA DA EMISSAO', 930, 400),
    ...esq('6169 - MARCOS HENRIQUE TAVEIRA', 75, 420),
    ...esq('119.888.076-70', 700, 420),
    ...esq('21/07/2026', 935, 420),

    ...esq('ENDERECO', 70, 455),
    ...esq('BAIRRO / DISTRITO', 560, 455),
    ...esq('CEP', 790, 455),
    ...esq('DATA DA ENTRADA / SAIDA', 900, 455),
    ...esq('SITIO AGROPECUARIA NOVA CONQUISTA, 1', 75, 475),
    ...esq('SAO SEBASTIAO DO PAIOL', 565, 475),
    ...esq('37478-000', 795, 475),
    ...esq('21/07/2026', 905, 475),

    ...esq('MUNICIPIO', 70, 510),
    ...esq('FONE / FAX', 430, 510),
    ...esq('UF', 620, 510),
    ...esq('INSCRICAO ESTADUAL', 690, 510),
    ...esq('HORA DA SAIDA', 930, 510),
    ...esq('Soledade de Minas', 75, 530),
    ...esq('MG', 622, 530),
    ...esq('0029982080016', 695, 530),
    ...esq('16:30', 950, 530),

    // ── Fatura / duplicatas ────────────────────────────────────────────────
    ...esq('FATURA', 70, 565),
    ...esq('Duplicata Vencimento Valor', 75, 585),
    ...esq('Duplicata Vencimento Valor', 255, 585),
    ...esq('Duplicata Vencimento Valor', 435, 585),
    ...esq('2-190690-1 21/07/2026 381,22', 75, 605),

    // ── Cálculo do imposto (valores alinhados à DIREITA da célula) ─────────
    ...esq('CALCULO DO IMPOSTO', 70, 640),
    ...esq('BASE DE CALCULO DO ICMS', 70, 665),
    ...esq('VALOR DO ICMS', 275, 665),
    ...esq('BASE DE CALCULO DO ICMS ST', 470, 665),
    ...esq('VALOR DO ICMS SUBSTITUICAO', 665, 665),
    ...esq('VALOR TOTAL DOS PRODUTOS', 870, 665),
    ...dir('0,00', 265, 685),
    ...dir('0,00', 460, 685),
    ...dir('0,00', 655, 685),
    ...dir('0,00', 860, 685),
    ...dir('391,00', 1055, 685),

    ...esq('VALOR DO FRETE', 70, 710),
    ...esq('VALOR DO SEGURO', 240, 710),
    ...esq('DESCONTO', 410, 710),
    ...esq('OUTRAS DESPESAS ACESSORIAS', 560, 710),
    ...esq('VALOR TOTAL DO IPI', 760, 710),
    ...esq('VALOR TOTAL DA NOTA', 900, 710),
    ...dir('0,00', 230, 730),
    ...dir('0,00', 400, 730),
    ...dir('9,78', 550, 730),
    ...dir('0,00', 750, 730),
    ...dir('0,00', 890, 730),
    ...dir('381,22', 1055, 730),

    // ── Transportador ──────────────────────────────────────────────────────
    ...esq('TRANSPORTADOR / VOLUMES TRANSPORTADOS', 70, 765),
    ...esq('NOME / RAZAO SOCIAL', 70, 790),
    ...esq('FRETE POR CONTA', 520, 790),
    ...esq('CODIGO ANTT', 640, 790),
    ...esq('PLACA DO VEICULO', 710, 790),
    ...esq('UF', 830, 790),
    ...esq('CNPJ / CPF', 880, 790),
    ...esq('1 - DESTINATARIO', 525, 810),
    ...esq('ENDERECO', 70, 845),
    ...esq('MUNICIPIO', 520, 845),
    ...esq('UF', 830, 845),
    ...esq('INSCRICAO ESTADUAL', 880, 845),
    ...esq('QUANTIDADE', 70, 880),
    ...esq('ESPECIE', 240, 880),
    ...esq('MARCA', 390, 880),
    ...esq('NUMERO', 520, 880),
    ...esq('PESO BRUTO', 760, 880),
    ...esq('PESO LIQUIDO', 920, 880),
    ...esq('1', 165, 900),
    ...dir('0,000', 900, 900),
    ...dir('0,000', 1055, 900),

    // ── Quadro de produtos: 13 colunas ─────────────────────────────────────
    ...esq('DADOS DOS PRODUTOS / SERVICOS', 70, 935),
    ...esq('COD.', 70, 960),
    ...esq('DESCRICAO DO PRODUTO / SERVICO', 130, 960),
    ...esq('NCM/SH', 350, 960),
    ...esq('CST', 430, 960),
    ...esq('CFOP', 480, 960),
    ...esq('UNIDADE', 530, 960),
    ...esq('QUANTIDADE', 600, 960),
    ...esq('V. UNITARIO', 700, 960),
    ...esq('VALOR TOTAL', 790, 960),
    ...esq('BC ICMS', 870, 960),
    ...esq('V. ICMS', 930, 960),
    ...esq('V. IPI', 985, 960),
    ...esq('ALIQUOTA', 1020, 960),

    ...esq('4490', 75, 985),
    ...esq('TUTOR 5 KG BASF', 135, 985),
    ...esq('38089291', 352, 985),
    ...esq('040', 435, 985),
    ...esq('5160', 483, 985),
    ...esq('Kg', 535, 985),
    ...dir('1,0000', 660, 985),
    ...dir('391,0000', 785, 985),
    ...dir('391,00', 860, 985),
    ...dir('0,00', 925, 985),
    ...dir('0,00', 980, 985),
    ...dir('0,00', 1015, 985),
    ...dir('0,00', 1055, 985),
    // Descrição continua abaixo, transbordando a coluna de descrição.
    ...esq('ONU 3077, SUBSTANCIA QUE APRESENTA RISCO PARA O', 135, 1005),
    ...esq('MEIO AMBIENTE, SOLIDA, N.E. (HIDROXIDO DE COBRE)', 135, 1025),
    ...esq('Reg MAPA: 02908, Cl. Tox.: 5, Receita: BR202605RA183521', 135, 1045),

    // ── Rodapé ─────────────────────────────────────────────────────────────
    ...esq('CALCULO DO ISSQN', 70, 1085),
    ...esq('INSCRICAO MUNICIPAL', 70, 1110),
    ...esq('VALOR TOTAL DOS SERVICOS', 240, 1110),
    ...esq('BASE DE CALCULO DO ISSQN', 520, 1110),
    ...esq('VALOR DO ISSQN', 800, 1110),
    ...esq('DADOS ADICIONAIS', 70, 1145),
    ...esq('INFORMACOES COMPLEMENTARES', 70, 1170),
    ...esq('RESERVADO AO FISCO', 700, 1170),
    ...esq('CARTAO DEBITO', 75, 1190),
    ...esq('Vendedor: MAYCON DOUGLAS DA SILVA FARIA COSTA', 75, 1210),
  ]
}
