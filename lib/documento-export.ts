/**
 * Formatos de saída de um documento lido: CSV (dados puros) e uma página HTML
 * autocontida que leva a FOTO junto da planilha.
 *
 * Fica aqui, e não dentro do route handler, por dois motivos: um arquivo de
 * rota do Next só deve exportar os métodos HTTP, e daqui a montagem do arquivo
 * pode ser testada sem subir servidor nem banco.
 */

export type CampoExtraido = { campo: string; valor: string }

/**
 * Escapa um campo para CSV. O separador é ";" (padrão pt-BR/Excel), mas os
 * valores em real têm VÍRGULA decimal ("192,00") — sem aspas, o LibreOffice
 * acaba usando a vírgula como separador e quebra a linha em várias colunas.
 * Por isso citamos qualquer célula com vírgula, ponto-e-vírgula, aspas ou quebra.
 */
export function csvCell(v: string): string {
  const s = String(v ?? '')
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Slug de arquivo sem acentos nem caracteres especiais. */
export function slugify(nome: string): string {
  return (
    nome
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // remove marcas de acento
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'documento'
  )
}

/** Escapa texto para HTML — os campos vêm de OCR/XML, nunca vão cru para a página. */
function h(v: string): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * A imagem é guardada como data URL. Só deixamos passar data URL de imagem —
 * um `javascript:` ou um `<svg>` com script embutido viraria XSS na hora em que
 * alguém abrisse o arquivo baixado.
 */
function imagemSegura(src: string | null): string | null {
  if (!src) return null
  return /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=\s]+$/.test(src) ? src : null
}

/**
 * Página autocontida com a FOTO e a planilha juntas.
 *
 * O CSV é ótimo para jogar no Excel, mas é texto puro — não carrega a foto do
 * documento, e a foto é justamente a prova de onde os valores saíram. Este
 * formato resolve isso num arquivo só: a imagem vai embutida como data URL,
 * então o HTML abre (e imprime em PDF) em qualquer lugar, sem internet e sem
 * depender de o servidor estar no ar.
 */
export function paginaHtml(doc: {
  nome: string
  imagem: string | null
  criadoEm: Date
  total: unknown
  campos: CampoExtraido[]
}): string {
  const img = imagemSegura(doc.imagem)
  const data = doc.criadoEm.toLocaleDateString('pt-BR')
  const total =
    doc.total != null && Number.isFinite(Number(doc.total))
      ? Number(doc.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : null

  const linhas = doc.campos
    .map((c) => `<tr><th>${h(c.campo)}</th><td>${h(c.valor)}</td></tr>`)
    .join('\n      ')

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h(doc.nome)}</title>
<style>
  :root { color-scheme: light; }
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 24px; background: #F0F2F5; color: #1C1E21; }
  .folha { max-width: 900px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 4px rgba(0,0,0,.12); }
  h1 { font-size: 20px; margin: 0 0 4px; color: #2d3561; }
  .sub { color: #65676B; font-size: 13px; margin: 0 0 20px; }
  .total { display: inline-block; background: #F0F7EF; color: #2d3561; border: 1px solid #5ab952; border-radius: 8px; padding: 8px 14px; font-weight: 700; margin-bottom: 20px; }
  .grade { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
  @media (max-width: 720px) { .grade { grid-template-columns: 1fr; } body { padding: 12px; } }
  img { width: 100%; border-radius: 8px; border: 1px solid #E4E6EB; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { text-align: left; padding: 7px 10px; border-bottom: 1px solid #E4E6EB; vertical-align: top; }
  th { color: #65676B; font-weight: 600; width: 45%; }
  td { font-weight: 600; }
  .rodape { margin-top: 20px; color: #8A8D91; font-size: 12px; }
  @media print {
    body { background: #fff; padding: 0; }
    .folha { box-shadow: none; border-radius: 0; padding: 0; }
  }
</style>
</head>
<body>
  <div class="folha">
    <h1>${h(doc.nome)}</h1>
    <p class="sub">Documento lido em ${h(data)}</p>
    ${total ? `<div class="total">Total: ${h(total)}</div>` : ''}
    <div class="grade">
      <div>${img ? `<img src="${img}" alt="Foto do documento">` : '<p class="sub">Sem foto anexada — o documento foi lido de arquivo (XML/PDF).</p>'}</div>
      <div>
        <table>
      ${linhas || '<tr><td colspan="2">Sem campos.</td></tr>'}
        </table>
      </div>
    </div>
    <p class="rodape">Gerado pelo Leitor de Documentos. Confira sempre os valores contra o documento original.</p>
  </div>
</body>
</html>`
}
