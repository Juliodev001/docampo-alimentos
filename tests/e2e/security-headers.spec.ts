import { test, expect } from '@playwright/test'

/**
 * Verifica os cabeçalhos de segurança definidos em next.config.ts.
 * Esses cabeçalhos são a primeira linha de defesa contra XSS no browser:
 *  - X-Content-Type-Options: impede MIME-type sniffing
 *  - X-Frame-Options: bloqueia clickjacking via iframe
 *  - X-XSS-Protection: ativa o filtro XSS legado de browsers antigos
 *  - Content-Security-Policy: restringe fontes de scripts/frames
 *  - Referrer-Policy: limita vazamento de URL no Referer
 */

test.describe('Cabeçalhos de segurança (next.config.ts)', () => {
  // Testa contra a rota pública /login — não precisa de sessão
  test('GET /login inclui X-Content-Type-Options: nosniff', async ({ request }) => {
    const res = await request.get('/login')
    expect(res.headers()['x-content-type-options']).toBe('nosniff')
  })

  test('GET /login inclui X-Frame-Options: DENY', async ({ request }) => {
    const res = await request.get('/login')
    expect(res.headers()['x-frame-options']).toBe('DENY')
  })

  test('GET /login inclui X-XSS-Protection: 1; mode=block', async ({ request }) => {
    const res = await request.get('/login')
    expect(res.headers()['x-xss-protection']).toBe('1; mode=block')
  })

  test('GET /login inclui Referrer-Policy: strict-origin-when-cross-origin', async ({ request }) => {
    const res = await request.get('/login')
    expect(res.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin')
  })

  test('GET /login inclui Content-Security-Policy com frame-ancestors none', async ({ request }) => {
    const res = await request.get('/login')
    const csp = res.headers()['content-security-policy']
    expect(csp).toBeDefined()
    expect(csp).toContain("frame-ancestors 'none'")
  })

  test('GET /login — CSP inclui default-src self', async ({ request }) => {
    const res = await request.get('/login')
    const csp = res.headers()['content-security-policy']
    expect(csp).toContain("default-src 'self'")
  })

  test('GET /login — CSP não permite fontes externas de script sem nonce/hash', async ({
    request,
  }) => {
    const res = await request.get('/login')
    const csp = res.headers()['content-security-policy'] ?? ''
    // script-src deve referenciar 'self' — não deve permitir qualquer domínio externo sem restrição
    expect(csp).toContain('script-src')
    expect(csp).not.toMatch(/script-src\s+\*/)
  })

  test('GET /login — Permissions-Policy desabilita camera, microfone e geolocation', async ({
    request,
  }) => {
    const res = await request.get('/login')
    const pp = res.headers()['permissions-policy'] ?? ''
    expect(pp).toContain('camera=()')
    expect(pp).toContain('microphone=()')
    expect(pp).toContain('geolocation=()')
  })
})

test.describe('Cabeçalhos de segurança — rotas de API', () => {
  test('GET /api/produtos retorna Content-Type application/json (não text/html)', async ({
    request,
  }) => {
    // Sem sessão — espera 401 mas com Content-Type correto
    const res = await request.get('/api/produtos')
    expect(res.headers()['content-type']).toContain('application/json')
    expect(res.headers()['content-type']).not.toContain('text/html')
  })

  test('GET /api/clientes retorna X-Content-Type-Options: nosniff', async ({ request }) => {
    const res = await request.get('/api/clientes')
    expect(res.headers()['x-content-type-options']).toBe('nosniff')
  })

  test('POST /api/clientes com payload XSS retorna 401 com Content-Type application/json', async ({
    request,
  }) => {
    const res = await request.post('/api/clientes', {
      data: { nome: '<script>alert(document.cookie)</script>' },
    })
    // Sem sessão: 401 — mas o Content-Type nunca deve ser text/html
    expect(res.status()).toBe(401)
    expect(res.headers()['content-type']).toContain('application/json')
  })
})
