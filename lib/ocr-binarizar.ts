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
 * A saída é o método de Bradley–Roth: cada pixel é comparado com a MÉDIA da
 * sua vizinhança, não com a página. Onde há sombra, a vizinhança também está
 * escura, e o contraste local entre letra e papel se preserva. A média de
 * qualquer janela sai em tempo constante via imagem integral, então o custo é
 * duas passadas sobre os pixels — irrelevante perto do próprio OCR.
 *
 * Aplicar isso sempre seria um retrocesso: em captura de tela de planilha o
 * método realça a textura do fundo e piora a leitura das células (já testado
 * e revertido uma vez neste projeto). Por isso `fundoDesigual` decide, medindo
 * se o "branco" da imagem varia de uma região para outra.
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
 * Binariza a imagem in place pelo método de Bradley–Roth.
 *
 * `janelaDiv` define o tamanho da vizinhança como uma fração da largura: 1/8 é
 * o valor do artigo original e cobre bem um bloco de texto sem atravessar a
 * página. `t` é a tolerância — quanto o pixel precisa ser mais escuro que a
 * média local, em porcentagem, para virar tinta. Valores altos demais comem
 * texto fino; baixos demais deixam o ruído do papel passar.
 */
export function binarizarAdaptativo(img: ImagemRGBA, janelaDiv = 8, t = 12): void {
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
  const fator = (100 - t) / 100

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
      const soma = integral[y1 * w + x1] - b - c + a

      const i = (y * w + x) * 4
      const escuro = luz(d, i) * conta < soma * fator
      const v = escuro ? 0 : 255
      d[i] = d[i + 1] = d[i + 2] = v
      d[i + 3] = 255
    }
  }
}
