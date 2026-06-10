/**
 * Teste de tempo de resposta — requisições sequenciais, sem concorrência
 *
 * Mede latência real de cada endpoint (1 request por vez).
 * Faz 3 warmup descartados + 20 amostras por endpoint.
 *
 * Uso:
 *   npx tsx scripts/response-time.ts
 *   LOAD_TEST_URL=http://localhost:3001 npx tsx scripts/response-time.ts
 *   LOAD_TEST_SESSION="session=eyJ..." npx tsx scripts/response-time.ts
 *   SAMPLES=50 npx tsx scripts/response-time.ts
 */

const BASE_URL    = (process.env.LOAD_TEST_URL   ?? 'http://localhost:3001').replace(/\/$/, '')
const SESSION     = process.env.LOAD_TEST_SESSION ?? ''
const SAMPLES     = parseInt(process.env.SAMPLES  ?? '20', 10)
const WARMUP      = 3

const RESET  = '\x1b[0m'
const BOLD   = '\x1b[1m'
const GREEN  = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED    = '\x1b[31m'
const CYAN   = '\x1b[36m'
const DIM    = '\x1b[2m'
const BLUE   = '\x1b[34m'

interface Endpoint {
  name:  string
  path:  string
  auth?: boolean
  note:  string
}

const endpoints: Endpoint[] = [
  { name: 'Login page',             path: '/login',                              note: 'SSR público' },
  { name: 'API /produtos',          path: '/api/produtos',         auth: true,  note: 'listagem simples' },
  { name: 'API /compras',           path: '/api/compras',          auth: true,  note: 'listagem com joins' },
  { name: 'API /produtores',        path: '/api/produtores',       auth: true,  note: 'listagem com joins' },
  { name: 'API /colheita',          path: '/api/colheita',         auth: true,  note: 'listagem lavoura' },
  { name: 'API /relatorios DRE',    path: '/api/relatorios?tipo=dre', auth: true, note: '2 queries paralelas' },
  { name: 'API /lavoura/stats',     path: '/api/lavoura/stats',    auth: true,  note: '2 queries paralelas' },
  { name: 'API /dashboard/fin.',    path: '/api/dashboard/financeiro', auth: true, note: '5 queries paralelas' },
]

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

function colorMs(ms: number): string {
  if (ms < 100)  return `${GREEN}${ms.toFixed(0)} ms${RESET}`
  if (ms < 300)  return `${YELLOW}${ms.toFixed(0)} ms${RESET}`
  if (ms < 1000) return `${RED}${ms.toFixed(0)} ms${RESET}`
  return `${RED}${BOLD}${ms.toFixed(0)} ms${RESET}`
}

function histogram(samples: number[]): string {
  const buckets = [
    { label: '<50ms',    max: 50 },
    { label: '50-100ms', max: 100 },
    { label: '100-300ms',max: 300 },
    { label: '300-1s',   max: 1000 },
    { label: '>1s',      max: Infinity },
  ]
  const counts = buckets.map(b => ({ label: b.label, count: 0 }))
  for (const ms of samples) {
    const i = buckets.findIndex(b => ms < b.max)
    if (i >= 0) counts[i].count++
  }
  return counts
    .filter(b => b.count > 0)
    .map(b => {
      const bar = '█'.repeat(Math.round(b.count / samples.length * 20))
      const pct = ((b.count / samples.length) * 100).toFixed(0).padStart(3)
      return `    ${b.label.padEnd(11)} ${bar.padEnd(20)} ${pct}%  (${b.count}/${samples.length})`
    })
    .join('\n')
}

async function measure(endpoint: Endpoint): Promise<number[]> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (endpoint.auth && SESSION) headers['Cookie'] = SESSION

  const url = `${BASE_URL}${endpoint.path}`
  const times: number[] = []

  // warmup
  for (let i = 0; i < WARMUP; i++) {
    const t = performance.now()
    await fetch(url, { headers, redirect: 'manual' })
    void (performance.now() - t) // descartado
  }

  // amostras reais
  for (let i = 0; i < SAMPLES; i++) {
    const t = performance.now()
    await fetch(url, { headers, redirect: 'manual' })
    times.push(performance.now() - t)
    // pequeno intervalo para não saturar o servidor
    await new Promise(r => setTimeout(r, 20))
  }

  return times
}

async function run(endpoint: Endpoint): Promise<void> {
  process.stdout.write(`  ${DIM}medindo ${endpoint.name}...${RESET}`)
  let times: number[]
  try {
    times = await measure(endpoint)
  } catch (err) {
    process.stdout.write('\r' + ' '.repeat(60) + '\r')
    console.log(`  ${RED}✗ ${endpoint.name} — erro de conexão${RESET}`)
    return
  }
  process.stdout.write('\r' + ' '.repeat(60) + '\r')

  const sorted = [...times].sort((a, b) => a - b)
  const min  = sorted[0]
  const max  = sorted[sorted.length - 1]
  const mean = times.reduce((s, v) => s + v, 0) / times.length
  const p50  = percentile(sorted, 50)
  const p95  = percentile(sorted, 95)
  const p99  = percentile(sorted, 99)

  const authFlag = endpoint.auth && !SESSION ? `${YELLOW}[sem sessão → redirect]${RESET}` : ''

  console.log(`\n${BOLD}${CYAN}${endpoint.name}${RESET}  ${DIM}${endpoint.note}${RESET}  ${authFlag}`)
  console.log(`  Mín / Média / Máx : ${colorMs(min)} / ${colorMs(mean)} / ${colorMs(max)}`)
  console.log(`  P50 : ${colorMs(p50)}   P95 : ${colorMs(p95)}   P99 : ${colorMs(p99)}`)
  console.log(`  Distribuição (${SAMPLES} amostras):`)
  console.log(histogram(times))
}

async function main(): Promise<void> {
  console.log(`\n${BOLD}═══════════════════════════════════════════════════`)
  console.log(`  Tempo de Resposta Sequencial — ${BASE_URL}`)
  console.log(`  ${SAMPLES} amostras por endpoint (+${WARMUP} warmup descartados)`)
  console.log(`═══════════════════════════════════════════════════${RESET}`)

  if (!SESSION) {
    console.log(`\n${YELLOW}⚠  LOAD_TEST_SESSION não definido — endpoints auth receberão redirect.${RESET}`)
  }

  for (const ep of endpoints) {
    await run(ep)
  }

  console.log(`\n${BOLD}═══════════════════════════════════════════════════`)
  console.log(`  TABELA RESUMO`)
  console.log(`═══════════════════════════════════════════════════${RESET}`)
  console.log(`${'Endpoint'.padEnd(28)} ${'P50'.padStart(9)} ${'P95'.padStart(9)} ${'P99'.padStart(9)}`)
  console.log('─'.repeat(58))

  // Re-run lightweight para gerar tabela (só estatísticas)
  for (const ep of endpoints) {
    process.stdout.write(`  ${DIM}...${RESET}\r`)
    let times: number[]
    try {
      times = await measure(ep)
    } catch {
      console.log(`${ep.name.padEnd(28)} ${'ERR'.padStart(9)} ${'ERR'.padStart(9)} ${'ERR'.padStart(9)}`)
      continue
    }
    process.stdout.write(' '.repeat(20) + '\r')

    const sorted = [...times].sort((a, b) => a - b)
    const p50 = percentile(sorted, 50)
    const p95 = percentile(sorted, 95)
    const p99 = percentile(sorted, 99)

    const p50s = `${p50.toFixed(0)} ms`.padStart(9)
    const p95s = `${p95.toFixed(0)} ms`.padStart(9)
    const p99s = `${p99.toFixed(0)} ms`.padStart(9)

    const color = p99 > 1000 ? RED : p99 > 300 ? YELLOW : p99 > 100 ? BLUE : GREEN
    console.log(`${color}${ep.name.padEnd(28)}${p50s}${p95s}${p99s}${RESET}`)
  }

  console.log('─'.repeat(58))
  console.log(`\n${DIM}Verde <100ms · Azul <300ms · Amarelo <1s · Vermelho ≥1s (por P99)${RESET}\n`)
}

main().catch(err => {
  console.error(`${RED}Erro:${RESET}`, err)
  process.exit(1)
})
