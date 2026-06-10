/**
 * Teste de carga — autocannon v8
 *
 * Uso:
 *   npx tsx scripts/load-test.ts
 *   LOAD_TEST_URL=http://meu-servidor:3000 npx tsx scripts/load-test.ts
 *   LOAD_TEST_SESSION="session=eyJ..." npx tsx scripts/load-test.ts
 *
 * Para endpoints autenticados defina LOAD_TEST_SESSION com o valor
 * completo do cookie (copie do DevTools → Application → Cookies).
 */

import autocannon, { Result } from 'autocannon'

const BASE_URL = (process.env.LOAD_TEST_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const SESSION_COOKIE = process.env.LOAD_TEST_SESSION ?? ''

const RESET  = '\x1b[0m'
const BOLD   = '\x1b[1m'
const GREEN  = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED    = '\x1b[31m'
const CYAN   = '\x1b[36m'
const DIM    = '\x1b[2m'

interface Scenario {
  name:        string
  path:        string
  method?:     string
  connections: number
  duration:    number
  note:        string
  auth?:       boolean
}

const scenarios: Scenario[] = [
  {
    name:        '1. Página de login (pública)',
    path:        '/login',
    connections: 10,
    duration:    5,
    note:        'Baseline — SSR sem DB',
  },
  {
    name:        '2. API sem sessão → 401 rápido',
    path:        '/api/produtos',
    connections: 50,
    duration:    5,
    note:        'Mede custo do middleware de auth (early-return 401)',
  },
  {
    name:        '3. Dashboard financeiro (autenticado)',
    path:        '/api/dashboard/financeiro',
    connections: 10,
    duration:    10,
    note:        '5 queries Prisma em paralelo — endpoint mais pesado',
    auth:        true,
  },
  {
    name:        '4. Relatório DRE',
    path:        '/api/relatorios?tipo=dre',
    connections: 10,
    duration:    10,
    note:        '2 queries paralelas — NF-e + compras',
    auth:        true,
  },
  {
    name:        '5. Stats da lavoura',
    path:        '/api/lavoura/stats',
    connections: 10,
    duration:    10,
    note:        '2 queries paralelas — colheitas + saídas',
    auth:        true,
  },
  {
    name:        '6. Spike — login (100 conexões)',
    path:        '/login',
    connections: 100,
    duration:    5,
    note:        'Simula pico repentino na página pública',
  },
]

function colorLatency(ms: number): string {
  if (ms < 100)  return `${GREEN}${ms} ms${RESET}`
  if (ms < 500)  return `${YELLOW}${ms} ms${RESET}`
  return `${RED}${ms} ms${RESET}`
}

function colorErrors(n: number): string {
  if (n === 0) return `${GREEN}0${RESET}`
  return `${RED}${n}${RESET}`
}

function printResult(scenario: Scenario, res: Result): void {
  const lat  = res.latency
  const req  = res.requests
  const errs = res.errors + res.timeouts
  const non2 = res.non2xx

  console.log(`\n${BOLD}${CYAN}${scenario.name}${RESET}`)
  console.log(`${DIM}${scenario.note}${RESET}`)
  console.log(`${DIM}${scenario.connections} conexões × ${scenario.duration}s${RESET}`)
  console.log(`  Throughput  : ${BOLD}${req.average.toFixed(1)} req/s${RESET}  (total: ${req.total})`)
  console.log(`  Latência P50: ${colorLatency(lat.p50 ?? 0)}`)
  console.log(`  Latência P90: ${colorLatency(lat.p90 ?? 0)}`)
  console.log(`  Latência P99: ${colorLatency(lat.p99 ?? 0)}`)
  console.log(`  Erros/timeouts: ${colorErrors(errs)}`)
  if (non2 > 0) {
    console.log(`  Respostas não-2xx: ${YELLOW}${non2}${RESET}`)
  }

  const codes = res.statusCodeStats
  if (codes && Object.keys(codes).length > 0) {
    const summary = Object.entries(codes).map(([code, s]) => `${code}×${(s as { count: number }).count}`).join('  ')
    console.log(`  Status codes: ${DIM}${summary}${RESET}`)
  }
}

async function runScenario(scenario: Scenario): Promise<Result> {
  const headers: Record<string, string> = { 'Accept': 'application/json' }
  if (scenario.auth && SESSION_COOKIE) {
    headers['Cookie'] = SESSION_COOKIE
  }

  return autocannon({
    url:         `${BASE_URL}${scenario.path}`,
    connections: scenario.connections,
    duration:    scenario.duration,
    headers:     Object.keys(headers).length ? headers : undefined,
    silent:      true,
  })
}

async function main(): Promise<void> {
  console.log(`\n${BOLD}═══════════════════════════════════════════════════`)
  console.log(`  Teste de Carga — ${BASE_URL}`)
  console.log(`═══════════════════════════════════════════════════${RESET}`)

  if (!SESSION_COOKIE) {
    console.log(`\n${YELLOW}⚠  LOAD_TEST_SESSION não definido.`)
    console.log(`   Endpoints autenticados receberão 401 (mede custo do middleware).`)
    console.log(`   Para testar com sessão real:`)
    console.log(`   LOAD_TEST_SESSION="session=<token>" npx tsx scripts/load-test.ts${RESET}`)
  }

  const results: Array<{ scenario: Scenario; result: Result }> = []

  for (const scenario of scenarios) {
    process.stdout.write(`\n${DIM}Executando: ${scenario.name}...${RESET}`)
    const result = await runScenario(scenario)
    process.stdout.write('\r' + ' '.repeat(60) + '\r')
    printResult(scenario, result)
    results.push({ scenario, result })
  }

  // Resumo final
  console.log(`\n${BOLD}═══════════════════════════════════════════════════`)
  console.log(`  RESUMO`)
  console.log(`═══════════════════════════════════════════════════${RESET}`)
  console.log(
    `${'Cenário'.padEnd(42)} ${'RPS'.padStart(8)} ${'P50'.padStart(8)} ${'P99'.padStart(8)} ${'Erros'.padStart(7)}`
  )
  console.log('─'.repeat(76))

  let hasWarning = false
  for (const { scenario, result } of results) {
    const rps    = result.requests.average.toFixed(1).padStart(8)
    const p50    = `${result.latency.p50 ?? 0} ms`.padStart(8)
    const p99    = `${result.latency.p99 ?? 0} ms`.padStart(8)
    const errs   = String(result.errors + result.timeouts).padStart(7)
    const name   = scenario.name.substring(0, 41).padEnd(42)

    const p99val = result.latency.p99 ?? 0
    const errval = result.errors + result.timeouts
    const color  = p99val > 1000 || errval > 0 ? RED : p99val > 300 ? YELLOW : GREEN

    if (p99val > 1000 || errval > 0) hasWarning = true

    console.log(`${color}${name}${rps}${p50}${p99}${errs}${RESET}`)
  }

  console.log('─'.repeat(76))
  if (hasWarning) {
    console.log(`\n${RED}${BOLD}⚠  Há cenários com P99 > 1s ou erros. Investigar antes de produção.${RESET}`)
  } else {
    console.log(`\n${GREEN}${BOLD}✓  Todos os cenários dentro dos limites aceitáveis.${RESET}`)
  }
  console.log()
}

main().catch((err) => {
  console.error(`${RED}Erro fatal:${RESET}`, err)
  process.exit(1)
})
