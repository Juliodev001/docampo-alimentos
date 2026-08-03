// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

const { mockGet } = vi.hoisted(() => {
  process.env.SESSION_SECRET = 'test-secret-key-minimo-32-chars-ok'
  return { mockGet: vi.fn() }
})

vi.mock('@/lib/session', () => ({ decrypt: vi.fn().mockResolvedValue(null) }))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({ get: mockGet })),
}))

import { NextRequest } from 'next/server'
import proxy from '@/proxy'
import nextConfig from '@/next.config'

const makeReq = (path = '/produtores') => new NextRequest(`http://localhost${path}`)

const HEADERS_REQUIRED = [
  'x-frame-options',
  'x-content-type-options',
  'x-xss-protection',
  'referrer-policy',
  'permissions-policy',
  'content-security-policy',
]

// Os headers de segurança são aplicados pelo Next a partir de headers() no
// next.config.ts — única fonte de verdade (ver comentário em proxy.ts). O
// proxy só decide sessão/redirect e devolve NextResponse.next(), que não
// carrega esses headers: quem os injeta é o servidor, em runtime. Por isso a
// asserção é feita sobre a configuração, não sobre a resposta do proxy.
async function headersDoConfig(): Promise<Map<string, string>> {
  const entries = await nextConfig.headers!()
  const pares = entries.flatMap((e) =>
    (e.headers as { key: string; value: string }[]).map(
      (h) => [h.key.toLowerCase(), h.value] as [string, string],
    ),
  )
  return new Map(pares)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGet.mockReturnValue(undefined)
})

// ─── 1. Presença dos headers ─────────────────────────────────────────────────
describe('Headers de segurança — presença', () => {
  it.each(HEADERS_REQUIRED)('next.config define "%s"', async (header) => {
    const headers = await headersDoConfig()
    expect(headers.get(header)).toBeDefined()
  })

  it('todos os 6 headers de segurança estão configurados', async () => {
    const headers = await headersDoConfig()
    for (const h of HEADERS_REQUIRED) {
      expect(headers.get(h), `faltando header: ${h}`).toBeDefined()
    }
  })
})

// ─── 2. Valores corretos dos headers ─────────────────────────────────────────
describe('Headers de segurança — valores', () => {
  it('X-Frame-Options é DENY — impede clickjacking', async () => {
    const headers = await headersDoConfig()
    expect(headers.get('x-frame-options')).toBe('DENY')
  })

  it('X-Content-Type-Options é nosniff — impede MIME sniffing', async () => {
    const headers = await headersDoConfig()
    expect(headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('X-XSS-Protection está ativo com mode=block', async () => {
    const headers = await headersDoConfig()
    expect(headers.get('x-xss-protection')).toBe('1; mode=block')
  })

  it('Referrer-Policy é strict-origin-when-cross-origin', async () => {
    const headers = await headersDoConfig()
    expect(headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
  })

  it('Permissions-Policy desativa camera, microphone e geolocation', async () => {
    const headers = await headersDoConfig()
    const policy = headers.get('permissions-policy') ?? ''
    expect(policy).toContain('camera=()')
    expect(policy).toContain('microphone=()')
    expect(policy).toContain('geolocation=()')
  })
})

// ─── 3. Content-Security-Policy ──────────────────────────────────────────────
describe('Content-Security-Policy', () => {
  it('CSP contém default-src self', async () => {
    const headers = await headersDoConfig()
    expect(headers.get('content-security-policy') ?? '').toContain("default-src 'self'")
  })

  it('CSP bloqueia frame-ancestors — segunda defesa contra clickjacking', async () => {
    const headers = await headersDoConfig()
    expect(headers.get('content-security-policy') ?? '').toContain("frame-ancestors 'none'")
  })

  it('CSP restringe connect-src a self — impede exfiltração de dados', async () => {
    const headers = await headersDoConfig()
    expect(headers.get('content-security-policy') ?? '').toContain("connect-src 'self'")
  })

  it('CSP restringe font-src a self', async () => {
    const headers = await headersDoConfig()
    expect(headers.get('content-security-policy') ?? '').toContain("font-src 'self'")
  })

  it('CSP restringe img-src — permite apenas self, data: e blob:', async () => {
    const headers = await headersDoConfig()
    expect(headers.get('content-security-policy') ?? '').toContain("img-src 'self' data: blob:")
  })

  it('CSP não libera unsafe-eval — só wasm-unsafe-eval para o Tesseract', async () => {
    const csp = (await headersDoConfig()).get('content-security-policy') ?? ''
    expect(csp).toContain("'wasm-unsafe-eval'")
    expect(csp).not.toContain("'unsafe-eval'")
  })
})

// ─── 4. Headers ausentes indesejados ─────────────────────────────────────────
describe('Headers de segurança — sem vazamento de informação', () => {
  it('resposta não expõe X-Powered-By', async () => {
    const res = await proxy(makeReq('/login'))
    expect(res.headers.get('x-powered-by')).toBeNull()
  })

  it('resposta não expõe Server com versão', async () => {
    const res = await proxy(makeReq('/login'))
    const server = res.headers.get('server') ?? ''
    expect(server).not.toMatch(/\d+\.\d+/)
  })
})

// ─── 5. Configuração next.config.ts ──────────────────────────────────────────
describe('next.config.ts — headers() configurados', () => {
  it('exporta função headers()', async () => {
    expect(typeof nextConfig.headers).toBe('function')
  })

  it('headers() retorna array com ao menos uma entrada source', async () => {
    const entries = await nextConfig.headers!()
    expect(entries.length).toBeGreaterThan(0)
    expect(entries[0].source).toBeDefined()
  })

  it('headers() cobre todas as rotas com /(.*)', async () => {
    const entries = await nextConfig.headers!()
    const universal = entries.find((e) => e.source === '/(.*)')
    expect(universal).toBeDefined()
  })
})

// ─── 6. Comportamento do proxy ───────────────────────────────────────────────
describe('proxy — sessão e redirects', () => {
  it('rota protegida sem sessão redireciona para /login', async () => {
    mockGet.mockReturnValue(undefined)
    const res = await proxy(makeReq('/dashboard'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('redirect para / quando já autenticado não expõe sessão em header', async () => {
    const { decrypt } = await import('@/lib/session')
    vi.mocked(decrypt).mockResolvedValueOnce({
      userId: 'u-1', name: 'Admin', email: 'a@a.com', role: 'DONO', expiresAt: new Date(),
    })
    mockGet.mockReturnValue({ value: 'valid-token' })
    const res = await proxy(makeReq('/login'))
    expect(res.headers.get('authorization')).toBeNull()
    expect(res.headers.get('x-session-token')).toBeNull()
  })
})
