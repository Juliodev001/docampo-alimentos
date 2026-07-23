import { describe, it, expect } from 'vitest'
import { nivelarIluminacao, fundoDesigual, type ImagemRGBA } from '@/lib/ocr-binarizar'

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

describe('nivelamento de iluminação', () => {
  const LARG = 240
  const fundoEm = (x: number) => 250 - Math.round((x / (LARG - 1)) * 130)
  const ehTinta = (x: number, y: number) => y % 10 < 3 && x % 6 < 3
  const paginaComSombra = () =>
    imagem(LARG, 120, (x, y) => (ehTinta(x, y) ? fundoEm(x) - 80 : fundoEm(x)))

  it('desfaz a inversão que a sombra cria entre tinta e papel', () => {
    // O ponto: ANTES do nivelamento, a tinta do canto claro (163) é mais CLARA
    // que o papel do canto escuro (136). Nenhum limiar global separa os dois, e
    // e por isso que blocos inteiros da DANFE sumiam. Depois do nivelamento, o
    // papel mais escuro da pagina tem de ficar acima da tinta mais clara.
    const antes = paginaComSombra()
    expect(tomEm(antes, 12, 1)).toBeGreaterThan(tomEm(antes, 210, 6)) // inversão

    const img = paginaComSombra()
    nivelarIluminacao(img)

    const papeis = [tomEm(img, 12, 6), tomEm(img, 210, 6)]
    const tintas = [tomEm(img, 12, 1), tomEm(img, 210, 1)]
    expect(Math.min(...papeis)).toBeGreaterThan(Math.max(...tintas))
  })

  it('deixa o papel com o mesmo tom nos dois extremos da página', () => {
    const img = paginaComSombra()
    nivelarIluminacao(img)
    // Antes, o papel ia de 243 a 136 — 107 de diferença ao longo da página.
    const diferenca = Math.abs(tomEm(img, 12, 6) - tomEm(img, 210, 6))
    expect(diferenca).toBeLessThan(25)
  })

  it('preserva a escala de cinza, sem binarizar', () => {
    // Decidir preto ou branco pixel a pixel destruiu os dígitos de corpo 4 numa
    // leitura real; o limiar tem de ficar com o Tesseract, que olha a forma do
    // glifo. Aqui garantimos que a saída ainda tem meios-tons.
    const img = paginaComSombra()
    nivelarIluminacao(img)
    // Uma asserção por pixel deixaria o teste em dezenas de milhares de
    // verificações; agregamos e conferimos o resumo.
    let intermediarios = 0
    let foraDaEscalaDeCinza = 0
    for (let i = 0; i < img.data.length; i += 4) {
      const v = img.data[i]
      if (img.data[i + 1] !== v || img.data[i + 2] !== v || img.data[i + 3] !== 255) {
        foraDaEscalaDeCinza++
      }
      if (v > 0 && v < 255) intermediarios++
    }
    expect(foraDaEscalaDeCinza).toBe(0)
    expect(intermediarios).toBeGreaterThan(0)
  })

  it('não estoura nem trava em imagem de um pixel de lado', () => {
    const img = imagem(1, 1, () => 128)
    expect(() => nivelarIluminacao(img)).not.toThrow()
  })
})
