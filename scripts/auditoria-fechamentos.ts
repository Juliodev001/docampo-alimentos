/**
 * Auditoria: recalcula todos os FechamentoPagamento pela função canônica
 * (lib/fechamento-calc) e compara com o que os recibos ANTIGOS (pré-unificação
 * de 2026-07-14) teriam impresso/pago para produtor e meeiros.
 *
 * Uso: npx tsx scripts/auditoria-fechamentos.ts
 * Aponta para o banco do .env (DATABASE_URL) — para auditar produção,
 * rode com o DATABASE_URL de produção.
 */
import { readFileSync } from 'node:fs'
import pg from 'pg'
import { calcularFechamento } from '../lib/fechamento-calc'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]
    }),
)

type Col = {
  quantidadeTotal: number; descarte: number; preco: number
  parceiroId: string | null; percParceiro: number; bandeja: number
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL ?? env.DATABASE_URL })
  await client.connect()

  const { rows: fechamentos } = await client.query(`
    SELECT f.*, p.nome AS produtor_nome
    FROM "FechamentoPagamento" f JOIN "Produtor" p ON p.id = f."produtorId"
    ORDER BY f."dataPagamento" ASC, f."createdAt" ASC
  `)

  let totalDivergencia = 0

  for (const f of fechamentos) {
    const { rows: colheitasRaw } = await client.query(
      `SELECT "quantidadeTotal", descarte, preco, "parceiroId", "percParceiro", bandeja
       FROM "ColheitaDiaria" WHERE "produtorId" = $1 AND data >= $2 AND data <= $3`,
      [f.produtorId, f.dataInicio, f.dataFim],
    )
    const colheitas: Col[] = colheitasRaw.map(c => ({
      quantidadeTotal: Number(c.quantidadeTotal), descarte: Number(c.descarte), preco: Number(c.preco),
      parceiroId: c.parceiroId, percParceiro: Number(c.percParceiro), bandeja: Number(c.bandeja),
    }))
    const { rows: valesRows } = await client.query(
      `SELECT valor FROM "Vale" WHERE "fechamentoId" = $1`, [f.id],
    )
    const valesVinculados = valesRows.reduce((s, v) => s + Number(v.valor), 0)
    const { rows: parceiros } = await client.query(
      `SELECT id, nome, percentual FROM "Parceiro" WHERE "produtorId" = $1 ORDER BY "createdAt" ASC`,
      [f.produtorId],
    )

    const ded = {
      combustivel: Number(f.combustivel), bandejaEmbalagem: Number(f.bandejaEmbalagem),
      valesDinheiro: Number(f.valesDinheiro), creditos: Number(f.creditos), debitosAnteriores: Number(f.debitosAnteriores),
    }

    // ── Regra oficial (nova) ──
    const novo = calcularFechamento(colheitas, ded, valesVinculados)

    // ── Recibo ANTIGO do produtor ──
    const totalBruto = colheitas.reduce((s, c) => s + (c.quantidadeTotal - c.descarte) * c.preco, 0)
    const meeirosBrutoOld = colheitas.reduce((s, c) => {
      if (!c.parceiroId) return s
      return s + Math.floor((c.quantidadeTotal - c.descarte) * (c.percParceiro / 100)) * c.preco
    }, 0)
    const donoBruto = totalBruto - meeirosBrutoOld
    const fatorProd = totalBruto > 0 ? donoBruto / totalBruto : 0
    const produtorOld = donoBruto
      - ded.bandejaEmbalagem * fatorProd
      - (ded.combustivel + ded.creditos + ded.debitosAnteriores) * fatorProd // valesDinheiro NÃO era descontado
      - valesVinculados

    // ── Recibo ANTIGO de cada meeiro ──
    const meeirosOld = parceiros.map(p => {
      const cs = colheitas.filter(c => c.parceiroId === p.id)
      const perc = (cs[0]?.percParceiro ?? Number(p.percentual)) / 100
      const faturaBruto = cs.reduce((s, c) => s + (c.quantidadeTotal - c.descarte) * c.preco, 0)
      const fator = totalBruto > 0 ? faturaBruto / totalBruto : 0
      const outras = (ded.combustivel + ded.valesDinheiro + ded.creditos + ded.debitosAnteriores) * fator * perc
      const descEmb = cs.reduce((s, c) => s + (c.quantidadeTotal - c.descarte) * (c.percParceiro / 100) * c.bandeja, 0)
      return { id: p.id, nome: p.nome, valor: faturaBruto * perc - descEmb - outras }
    })

    const data = new Date(f.dataPagamento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    console.log(`\n═══ ${data} — ${f.produtor_nome} — ${f.status} (bruto ${brl(totalBruto)}, deduções ${brl(novo.totalDeducoes)}${valesVinculados ? `, vales vinculados ${brl(valesVinculados)}` : ''})`)

    const linha = (nome: string, antigo: number, atual: number) => {
      const diff = antigo - atual
      totalDivergencia += Math.abs(diff)
      const flag = Math.abs(diff) < 0.005 ? 'ok' : diff > 0 ? `PAGO A MAIS ${brl(diff)}` : `PAGO A MENOS ${brl(-diff)}`
      console.log(`  ${nome.padEnd(22)} antigo ${brl(antigo).padStart(14)}  correto ${brl(atual).padStart(14)}  → ${flag}`)
    }

    linha(`${f.produtor_nome} (produtor)`, produtorOld, novo.produtor.liquido)
    for (const m of meeirosOld) {
      const atual = novo.meeiros.find(x => x.parceiroId === m.id)?.liquido ?? 0
      linha(`${m.nome} (meeiro)`, m.valor, atual)
    }

    const somaOld = produtorOld + meeirosOld.reduce((s, m) => s + m.valor, 0)
    const somaNova = novo.liquidoTotal
    const sobra = somaOld - somaNova
    if (Math.abs(sobra) >= 0.005) {
      console.log(`  ${'TOTAL DESEMBOLSADO'.padEnd(22)} antigo ${brl(somaOld).padStart(14)}  correto ${brl(somaNova).padStart(14)}  → ${sobra > 0 ? `caixa perdeu ${brl(sobra)}` : `caixa reteve ${brl(-sobra)}`}`)
    }
  }

  console.log(`\nSoma das divergências absolutas (todas as linhas): ${brl(totalDivergencia)}`)
  await client.end()
}

main().catch(e => { console.error(e); process.exit(1) })
