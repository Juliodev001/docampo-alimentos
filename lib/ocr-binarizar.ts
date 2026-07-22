/**
 * Binarização ADAPTATIVA para foto de papel.
 *
 * O preparo padrão do leitor aplica um limiar global: um único corte de brilho
 * para a página inteira. Isso funciona em captura de tela, onde o fundo é
 * branco uniforme, e falha em foto — o papel recebe luz de um lado só, curva
 * perto da dobra e faz sombra. O mesmo tom de cinza que é PAPEL no canto
 * iluminado é TINTA no canto escuro, e nenhum limiar único acerta os dois.
 * Numa DANFE fotografada, o efeito foi o bloco "CÁLCULO DO IMPOSTO" inteiro
 * desaparecer do texto reconhecido.
 *
 * A saída é dividir cada pixel pelo tom local do papel: onde há sombra, a
 * vizinhança também está escura, e a razão devolve o mesmo cinza que a região
 * iluminada teria. A média de qualquer janela sai em tempo constante via
 * imagem integral, então o custo é duas passadas sobre os pixels — irrelevante
 * perto do próprio OCR.
 *
 * Aplicar isso sempre seria um retrocesso: em captura de tela de planilha o
 * tratamento local realça a textura do fundo e piora a leitura das células (já
 * testado e revertido uma vez neste projeto). Por isso `fundoDesigual` decide,
 * medindo se o "branco" da imagem varia de uma região para outra.
 */

export type ImagemRGBA = { data: Uint8ClampedArray; width: number; height: number }

/** Luminância perceptual de um pixel. */
function luz(d: Uint8ClampedArray, i: number): number {
  return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
}

/**
 * O fundo da imagem varia de brilho ao longo da página?
 *
 * Divide a imagem numa grade e mede, em cada célula, o tom do PAPEL — estimado
 * pelo percentil 90 da luminância, já que o papel é a maioria dos pixels e o
 * mais claro deles. Numa captura de tela esse valor é praticamente o mesmo em
 * todas as células; numa foto com sombra ele desaba de um canto para o outro.
 *
 * A comparação usa a diferença entre o canto mais claro e o mais escuro, e não
 * o desvio padrão, porque o que quebra o limiar global é exatamente o extremo.
 */
export function fundoDesigual(img: ImagemRGBA, limiar = 38): boolean {
  const CELULAS = 4
  const cw = Math.floor(img.width / CELULAS)
  const ch = Math.floor(img.height / CELULAS)
  if (cw < 8 || ch < 8) return false

  const fundos: number[] = []
  for (let cy = 0; cy < CELULAS; cy++) {
    for (let cx = 0; cx < CELULAS; cx++) {
      const amostras: number[] = []
      for (let y = cy * ch; y < (cy + 1) * ch; y += 3) {
        for (let x = cx * cw; x < (cx + 1) * cw; x += 3) {
          amostras.push(luz(img.data, (y * img.width + x) * 4))
        }
      }
      if (!amostras.length) continue
      amostras.sort((a, b) => a - b)
      fundos.push(amostras[Math.floor(amostras.length * 0.9)])
    }
  }
  if (fundos.length < 4) return false
  return Math.max(...fundos) - Math.min(...fundos) > limiar
}

/**
 * Nivela a iluminação da imagem in place: divide cada pixel pelo tom local do
 * papel, achatando a sombra e deixando a página com um branco uniforme.
 *
 * A tentação aqui é binarizar direto — decidir preto ou branco por comparação
 * com a média local (Bradley–Roth). Testado numa DANFE fotografada, isso achou
 * MAIS texto (48 linhas contra 35) e ao mesmo tempo destruiu os digitos: os
 * valores monetarios sumiram e a razao social virou ruido. Faz sentido, porque
 * a letra da nota tem corpo 4 e traço de um pixel; decidir cada pixel
 * isoladamente engrossa uns e apaga outros, e o que sobra nao e mais um numero.
 *
 * Nivelar preserva a escala de cinza e entrega ao Tesseract uma pagina sem
 * sombra, para ele aplicar o proprio limiar — que e feito para texto e leva em
 * conta a forma do glifo, nao so o brilho do pixel. A janela grande (1/8 da
 * largura) faz a media se aproximar do tom do PAPEL, ja que o texto e minoria
 * de pixels numa area desse tamanho.
 */
export function nivelarIluminacao(img: ImagemRGBA, janelaDiv = 8): void {
  const { width: w, height: h, data: d } = img
  const total = w * h

  // Imagem integral em Float64: a soma de uma página 3000x3000 de valores até
  // 255 passa de 2,3 bilhões e estouraria um inteiro de 32 bits com sinal.
  const integral = new Float64Array(total)
  for (let y = 0; y < h; y++) {
    let soma = 0
    for (let x = 0; x < w; x++) {
      soma += luz(d, (y * w + x) * 4)
      integral[y * w + x] = (y > 0 ? integral[(y - 1) * w + x] : 0) + soma
    }
  }

  const s = Math.max(2, Math.floor(w / janelaDiv))
  const meio = s >> 1

  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - meio)
    const y1 = Math.min(h - 1, y + meio)
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - meio)
      const x1 = Math.min(w - 1, x + meio)
      const conta = (x1 - x0 + 1) * (y1 - y0 + 1)

      // Soma da janela pela imagem integral: canto inferior-direito menos as
      // duas faixas de fora, mais o canto que foi subtraído duas vezes.
      const a = y0 > 0 && x0 > 0 ? integral[(y0 - 1) * w + (x0 - 1)] : 0
      const b = y0 > 0 ? integral[(y0 - 1) * w + x1] : 0
      const c = x0 > 0 ? integral[y1 * w + (x0 - 1)] : 0
      const media = (integral[y1 * w + x1] - b - c + a) / conta

      // Razão entre o pixel e o papel ao redor dele. Onde havia sombra, a
      // média também está escura, então a razão devolve o mesmo cinza que a
      // região iluminada teria — a letra continua letra, o papel vira branco.
      const i = (y * w + x) * 4
      const v = Math.min(255, Math.round((luz(d, i) / Math.max(media, 1)) * 235))
      d[i] = d[i + 1] = d[i + 2] = v
      d[i + 3] = 255
    }
  }
}
