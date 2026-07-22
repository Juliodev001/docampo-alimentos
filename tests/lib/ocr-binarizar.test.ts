import { describe, it, expect } from 'vitest'
import { binarizarAdaptativo, fundoDesigual, type ImagemRGBA } from '@/lib/ocr-binarizar'

/** Cria uma imagem RGBA com um gerador de tom de cinza por pixel. */
function imagem(width: number, height: number, tom: (x: number, y: number) => number): ImagemRGBA {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const v = tom(x, y)
      data[i] = data[i + 1] = data[i + 2] = v
      data[i + 3] = 255
    }
  }
  return { data, width, height }
}

const tomEm = (img: ImagemRGBA, x: number, y: number) => img.data[(y * img.width + x) * 4]

describe('detecção de fundo desigual', () => {
  it('não acusa fundo uniforme (captura de tela)', () => {
    const img = imagem(200, 200, () => 250)
    expect(fundoDesigual(img)).toBe(false)
  })

  it('não acusa fundo uniforme com texto escuro espalhado', () => {
    // O texto é minoria de pixels; o percentil 90 continua sendo o papel.
    const img = imagem(200, 200, (x, y) => (y % 12 < 3 && x % 7 < 4 ? 20 : 250))
    expect(fundoDesigual(img)).toBe(false)
  })

  it('acusa a sombra que atravessa uma foto de papel', () => {
    // Papel iluminado de um lado: 250 na esquerda caindo para 120 na direita.
    const img = imagem(200, 200, (x) => 250 - Math.round((x / 199) * 130))
    expect(fundoDesigual(img)).toBe(true)
  })
})

describe('binarização adaptativa', () => {
  it('separa texto do papel mesmo com o fundo escurecendo ao longo da página', () => {
    // O ponto do teste: no canto escuro o PAPEL (120) é mais escuro que a
    // TINTA do canto claro (170). Nenhum limiar global acerta os dois — é
    // exatamente o caso que fazia blocos inteiros da DANFE sumirem.
    const LARG = 240
    const fundoEm = (x: number) => 250 - Math.round((x / (LARG - 1)) * 130)
    const ehTinta = (x: number, y: number) => y % 10 < 3 && x % 6 < 3
    const img = imagem(LARG, 120, (x, y) => (ehTinta(x, y) ? fundoEm(x) - 80 : fundoEm(x)))

    binarizarAdaptativo(img)

    // Amostras de tinta e de papel dos dois extremos da página.
    for (const x of [12, 210]) {
      expect(tomEm(img, x, 1)).toBe(0)    // dentro de uma faixa de tinta
      expect(tomEm(img, x, 6)).toBe(255)  // entre as faixas: papel
    }
  })

  it('deixa a saída estritamente preto e branco, com alfa opaco', () => {
    const img = imagem(60, 60, (x, y) => (x + y) % 200)
    binarizarAdaptativo(img)
    for (let i = 0; i < img.data.length; i += 4) {
      expect(img.data[i] === 0 || img.data[i] === 255).toBe(true)
      expect(img.data[i + 1]).toBe(img.data[i])
      expect(img.data[i + 2]).toBe(img.data[i])
      expect(img.data[i + 3]).toBe(255)
    }
  })

  it('não estoura nem trava em imagem de um pixel de lado', () => {
    const img = imagem(1, 1, () => 128)
    expect(() => binarizarAdaptativo(img)).not.toThrow()
  })
})
