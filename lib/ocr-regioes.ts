/**
 * Segundo passe de OCR para regiões COLORIDAS da imagem (badges/"pills" de
 * dropdown, células com fundo verde/amarelo, texto branco sobre azul...).
 *
 * O Tesseract binariza a página com um limiar global: texto claro sobre fundo
 * escuro, ou texto sobre fundo de cor média, simplesmente desaparece — numa
 * planilha de pagamento, a coluna "A RECEBER" (vermelho sobre verde) e os
 * badges de produto (branco sobre azul/marrom) não eram lidos.
 *
 * A solução: detectar essas regiões pela saturação da cor, recortar cada uma,
 * reprocessar o recorte (distância da cor de fundo → texto escuro sobre fundo
 * branco, independente da polaridade original) e reconhecê-lo separadamente.
 * As palavras voltam com o bbox no sistema da imagem inteira, então o
 * reconstruirLinhas as devolve para a linha visual correta.
 */

export type ImagemRGBA = { data: Uint8ClampedArray; width: number; height: number }
export type Regiao = { x0: number; y0: number; x1: number; y1: number }

const PASSO = 3        // amostragem da grade de detecção (px)
const CROMA_MIN = 50   // max(R,G,B) − min(R,G,B) mínimo para "pixel colorido"
const BRILHO_MIN = 60  // ignora pixels quase pretos (croma não confiável)
// Fundo colorido CLARO (amarelo, verde-claro...) vira quase branco na escala de
// cinza e o texto preto sobre ele é lido normalmente no passe principal — não
// precisa (nem deve) entrar no segundo passe. Além de desnecessário, um
// cabeçalho amarelo atravessando a tabela "emenda" as células coloridas
// vizinhas numa região gigante que estoura os filtros de tamanho.
const LUMINANCIA_MAX = 190

/**
 * Varre a imagem numa grade (1 pixel a cada PASSO) marcando os pontos de cor
 * saturada, agrupa os pontos vizinhos em componentes conexos e devolve o
 * bounding box de cada mancha colorida relevante. Filtra manchas minúsculas
 * (ruído) e gigantes (foto/ilustração — mais de ¼ da imagem).
 */
export function detectarRegioesColoridas(img: ImagemRGBA): Regiao[] {
  const gw = Math.ceil(img.width / PASSO)
  const gh = Math.ceil(img.height / PASSO)
  const colorido = new Uint8Array(gw * gh)

  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const x = Math.min(img.width - 1, gx * PASSO)
      const y = Math.min(img.height - 1, gy * PASSO)
      const i = (y * img.width + x) * 4
      const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2]
      const max = Math.max(r, g, b), min = Math.min(r, g, b)
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      if (max > BRILHO_MIN && max - min > CROMA_MIN && lum < LUMINANCIA_MAX) {
        colorido[gy * gw + gx] = 1
      }
    }
  }

  // Erosão: só sobrevive quem tem pelo menos 4 dos 8 vizinhos coloridos.
  // A compressão JPEG cria "halos" saturados ao redor de texto e bordas
  // (ex.: oliva em volta de texto preto sobre amarelo) — trilhas finas que
  // emendam regiões distintas numa só. A erosão elimina essas trilhas sem
  // afetar fundos sólidos (pills, células), cujo interior é denso.
  const erodido = new Uint8Array(gw * gh)
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      if (!colorido[gy * gw + gx]) continue
      let viz = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue
          const nx = gx + dx, ny = gy + dy
          if (nx >= 0 && ny >= 0 && nx < gw && ny < gh && colorido[ny * gw + nx]) viz++
        }
      }
      if (viz >= 4) erodido[gy * gw + gx] = 1
    }
  }

  const vista = new Uint8Array(gw * gh)
  const regioes: Regiao[] = []

  for (let inicio = 0; inicio < erodido.length; inicio++) {
    if (!erodido[inicio] || vista[inicio]) continue
    // BFS com 8 vizinhos — pontes de 1 célula unem partes da mesma mancha
    const fila = [inicio]
    vista[inicio] = 1
    let x0 = gw, y0 = gh, x1 = 0, y1 = 0, n = 0
    while (fila.length) {
      const c = fila.pop()!
      const cx = c % gw, cy = (c / gw) | 0
      n++
      if (cx < x0) x0 = cx
      if (cx > x1) x1 = cx
      if (cy < y0) y0 = cy
      if (cy > y1) y1 = cy
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx, ny = cy + dy
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue
          const ni = ny * gw + nx
          if (erodido[ni] && !vista[ni]) { vista[ni] = 1; fila.push(ni) }
        }
      }
    }
    const w = (x1 - x0 + 1) * PASSO
    const h = (y1 - y0 + 1) * PASSO
    if (w < 28 || h < 12 || w * h < 600) continue           // ruído/ícones (setas de dropdown...)
    if (n * PASSO * PASSO < w * h * 0.3) continue           // mancha esparsa (não é célula/badge)
    if (w * h > img.width * img.height * 0.25) continue     // foto/fundo — grande demais
    const regiao = {
      x0: x0 * PASSO,
      y0: y0 * PASSO,
      x1: Math.min((x1 + 1) * PASSO, img.width),
      y1: Math.min((y1 + 1) * PASSO, img.height),
    }
    // Confirma pela MEDIANA da região que o fundo é mesmo colorido escuro/médio
    // — um punhado de halos que sobreviveu à erosão sobre fundo claro (amarelo,
    // branco) não é uma região de segundo passe; o passe principal já a lê.
    const [br, bg2, bb] = corDeFundo(img, regiao)
    const lumFundo = 0.299 * br + 0.587 * bg2 + 0.114 * bb
    const cromaFundo = Math.max(br, bg2, bb) - Math.min(br, bg2, bb)
    if (lumFundo >= LUMINANCIA_MAX || cromaFundo < 40) continue
    regioes.push(regiao)
  }

  return regioes
}

/** Cor de fundo de uma região: mediana por canal (o texto é minoria de pixels). */
function corDeFundo(img: ImagemRGBA, r: Regiao): [number, number, number] {
  const rs: number[] = [], gs: number[] = [], bs: number[] = []
  for (let y = r.y0; y < r.y1; y += 2) {
    for (let x = r.x0; x < r.x1; x += 2) {
      const i = (y * img.width + x) * 4
      rs.push(img.data[i]); gs.push(img.data[i + 1]); bs.push(img.data[i + 2])
    }
  }
  const mediana = (a: number[]) => a.sort((p, q) => p - q)[a.length >> 1] ?? 255
  return [mediana(rs), mediana(gs), mediana(bs)]
}

/**
 * Reprocessa (in place) um recorte colorido para o OCR: estima a cor de fundo
 * (mediana por canal — o texto é minoria de pixels) e converte cada pixel em
 * "distância do fundo": quanto mais diferente do fundo, mais escuro. O texto
 * vira sempre escuro sobre branco, seja ele branco-sobre-azul ou
 * vermelho-sobre-verde.
 */
export function normalizarRegiaoColorida(crop: ImagemRGBA): void {
  const d = crop.data
  const total = crop.width * crop.height

  // mediana por canal com amostragem (a cada 2 pixels basta e evita sort gigante)
  const rs: number[] = [], gs: number[] = [], bs: number[] = []
  for (let p = 0; p < total; p += 2) {
    const i = p * 4
    rs.push(d[i]); gs.push(d[i + 1]); bs.push(d[i + 2])
  }
  const mediana = (a: number[]) => a.sort((x, y) => x - y)[a.length >> 1] ?? 255
  const bgR = mediana(rs), bgG = mediana(gs), bgB = mediana(bs)

  for (let p = 0; p < total; p++) {
    const i = p * 4
    const dist = (Math.abs(d[i] - bgR) + Math.abs(d[i + 1] - bgG) + Math.abs(d[i + 2] - bgB)) / 3
    const v = 255 - Math.min(255, dist * 2.2)
    d[i] = d[i + 1] = d[i + 2] = v
    d[i + 3] = 255
  }
}

/**
 * Divide um recorte JÁ NORMALIZADO (texto escuro sobre claro) em faixas
 * horizontais de texto, via projeção: uma linha da imagem é "texto" se tem
 * pixels escuros suficientes. Reconhecer cada faixa separadamente (PSM de
 * linha única) evita o Tesseract pular linhas de um bloco esparso — numa
 * coluna de valores com 5 células empilhadas, o PSM de bloco engolia uma.
 */
export function faixasDeTexto(crop: ImagemRGBA, margemX = 10): { y0: number; y1: number }[] {
  // margemX ignora as beiradas: bordas verticais de célula de tabela viram
  // colunas escuras contínuas no recorte normalizado e, sem isso, TODA linha
  // conta como texto — a projeção devolveria uma faixa única gigante.
  const x0 = Math.min(margemX, crop.width >> 2)
  const x1 = crop.width - x0
  const escurosPorLinha: number[] = []
  for (let y = 0; y < crop.height; y++) {
    let n = 0
    for (let x = x0; x < x1; x++) {
      if (crop.data[(y * crop.width + x) * 4] < 128) n++
    }
    escurosPorLinha.push(n)
  }
  const faixas: { y0: number; y1: number }[] = []
  let inicio = -1
  for (let y = 0; y <= crop.height; y++) {
    const temTexto = y < crop.height && escurosPorLinha[y] >= 2
    if (temTexto && inicio < 0) inicio = y
    if (!temTexto && inicio >= 0) {
      if (y - inicio >= 8) {
        faixas.push({ y0: Math.max(0, inicio - 3), y1: Math.min(crop.height, y + 3) })
      }
      inicio = -1
    }
  }
  return faixas
}

/** O centro do bbox cai dentro de alguma das regiões (com margem)? */
export function dentroDeAlgumaRegiao(
  bbox: { x0: number; y0: number; x1: number; y1: number },
  regioes: Regiao[],
  margem = 2
): boolean {
  const cx = (bbox.x0 + bbox.x1) / 2
  const cy = (bbox.y0 + bbox.y1) / 2
  return regioes.some(
    (r) => cx >= r.x0 - margem && cx <= r.x1 + margem && cy >= r.y0 - margem && cy <= r.y1 + margem
  )
}
