// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

vi.hoisted(() => { process.env.SESSION_SECRET = 'test-secret-key-minimo-32-chars-ok' })

const {
  mockClienteCreate, mockFornecedorCreate, mockProdutorCreate,
  mockProdutorFindUnique, mockProdutorCount, mockCompraFindMany, mockCompraUpdate,
} = vi.hoisted(() => ({
  mockClienteCreate:      vi.fn(),
  mockFornecedorCreate:   vi.fn(),
  mockProdutorCreate:     vi.fn(),
  mockProdutorFindUnique: vi.fn().mockResolvedValue(null),
  mockProdutorCount:      vi.fn().mockResolvedValue(0),
  mockCompraFindMany:     vi.fn(),
  mockCompraUpdate:       vi.fn(),
}))

vi.mock('@/lib/session', () => ({ getSession: vi.fn().mockResolvedValue({ userId: 'u-1' }) }))
vi.mock('next/headers', () => ({ cookies: vi.fn(() => Promise.resolve({ get: vi.fn(), set: vi.fn(), delete: vi.fn() })) }))
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))
vi.mock('@/lib/mem-cache', () => ({ memCache: { fetch: vi.fn((_, fn) => fn()), invalidate: vi.fn() } }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    cliente:    { create: mockClienteCreate, findMany: vi.fn().mockResolvedValue([]) },
    fornecedor: { create: mockFornecedorCreate, findMany: vi.fn().mockResolvedValue([]) },
    produtor:   { create: mockProdutorCreate, findUnique: mockProdutorFindUnique, findMany: vi.fn().mockResolvedValue([]), count: mockProdutorCount },
    compra:     { findMany: mockCompraFindMany, update: mockCompraUpdate },
  },
}))

import { NextRequest } from 'next/server'
import { POST as postCliente }    from '@/app/api/clientes/route'
import { POST as postFornecedor } from '@/app/api/fornecedores/route'
import { POST as postProdutor }   from '@/app/api/produtores/route'
import { GET  as getCompras }     from '@/app/api/compras/route'
import { PATCH as patchCompra }   from '@/app/api/compras/[id]/route'

beforeEach(() => vi.clearAllMocks())

// ─── Payloads ─────────────────────────────────────────────────────────────────
const XSS_PAYLOADS = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(document.cookie)>',
  '"><svg/onload=alert(1)>',
  '<iframe src="javascript:alert(1)"></iframe>',
  '<body onload=alert(1)>',
  '{{7*7}}',                                        // template injection
  '${7*7}',                                         // template literal injection
  '<script>alert(1)</script>',  // unicode escape
  '<ScRiPt>alert(1)</sCrIpT>',                      // case variation
  '<script\x20type="text/javascript">alert(1)</script>', // encoded space
  'jaVaScRiPt:alert(1)',                            // protocol case variation
  'data:text/html,<script>alert(1)</script>',       // data URI
  '<details open ontoggle=alert(1)>',
  '<input autofocus onfocus=alert(1)>',
  "';alert(1)//",
]

// ─── 1. Content-Type — todas as respostas devem ser application/json ──────────
describe('XSS — Content-Type das respostas', () => {
  it('POST /api/clientes retorna Content-Type application/json', async () => {
    mockClienteCreate.mockResolvedValue({ id: 'c-1', nome: 'Teste', createdAt: new Date() })
    const req = new NextRequest('http://localhost/api/clientes', {
      method: 'POST',
      body: JSON.stringify({ nome: 'Teste' }),
    })
    const res = await postCliente(req)
    expect(res.headers.get('content-type')).toContain('application/json')
  })

  it('POST /api/fornecedores retorna Content-Type application/json', async () => {
    mockFornecedorCreate.mockResolvedValue({ id: 'f-1', nome: 'Teste', createdAt: new Date() })
    const req = new NextRequest('http://localhost/api/fornecedores', {
      method: 'POST',
      body: JSON.stringify({ nome: 'Teste' }),
    })
    const res = await postFornecedor(req)
    expect(res.headers.get('content-type')).toContain('application/json')
  })

  it('POST /api/produtores retorna Content-Type application/json', async () => {
    mockProdutorFindUnique.mockResolvedValue(null)
    mockProdutorCreate.mockResolvedValue({ id: 'p-1', nome: 'Teste', cpf: null, telefone: null, parceiros: [], createdAt: new Date() })
    const req = new NextRequest('http://localhost/api/produtores', {
      method: 'POST',
      body: JSON.stringify({ nome: 'Teste', parceiros: [] }),
    })
    const res = await postProdutor(req)
    expect(res.headers.get('content-type')).toContain('application/json')
  })

  it('GET /api/compras retorna Content-Type application/json', async () => {
    mockCompraFindMany.mockResolvedValue([])
    const req = new NextRequest('http://localhost/api/compras')
    const res = await getCompras(req)
    expect(res.headers.get('content-type')).toContain('application/json')
  })
})

// ─── 2. XSS stored — campos de texto em clientes ─────────────────────────────
describe('XSS stored — POST /api/clientes (nome)', () => {
  it.each(XSS_PAYLOADS)('payload %s é armazenado como string e devolvido literal', async (payload) => {
    mockClienteCreate.mockResolvedValue({ id: 'c-1', nome: payload, createdAt: new Date() })
    const req = new NextRequest('http://localhost/api/clientes', {
      method: 'POST',
      body: JSON.stringify({ nome: payload }),
    })
    const res = await postCliente(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    // Payload devolvido como string literal — React/browser faz o escape na renderização
    expect(data.nome).toBe(payload)
    expect(res.headers.get('content-type')).toContain('application/json')
  })
})

// ─── 3. XSS stored — campos de texto em fornecedores ─────────────────────────
describe('XSS stored — POST /api/fornecedores (nome)', () => {
  it.each(XSS_PAYLOADS)('payload %s é armazenado como string e devolvido literal', async (payload) => {
    mockFornecedorCreate.mockResolvedValue({ id: 'f-1', nome: payload, createdAt: new Date() })
    const req = new NextRequest('http://localhost/api/fornecedores', {
      method: 'POST',
      body: JSON.stringify({ nome: payload }),
    })
    const res = await postFornecedor(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.nome).toBe(payload)
    expect(res.headers.get('content-type')).toContain('application/json')
  })
})

// ─── 4. XSS stored — campos de texto em produtores ───────────────────────────
describe('XSS stored — POST /api/produtores (nome e parceiros)', () => {
  it.each(XSS_PAYLOADS)('nome do produtor: payload %s retornado como string', async (payload) => {
    mockProdutorFindUnique.mockResolvedValue(null)
    mockProdutorCreate.mockResolvedValue({ id: 'p-1', nome: payload, cpf: null, telefone: null, parceiros: [], createdAt: new Date() })
    const req = new NextRequest('http://localhost/api/produtores', {
      method: 'POST',
      body: JSON.stringify({ nome: payload, parceiros: [] }),
    })
    const res = await postProdutor(req)
    const data = await res.json()
    if (res.status === 201) expect(data.nome).toBe(payload)
    expect(res.headers.get('content-type')).toContain('application/json')
  })

  it.each(XSS_PAYLOADS)('nome do parceiro: payload %s retornado como string', async (payload) => {
    mockProdutorFindUnique.mockResolvedValue(null)
    mockProdutorCreate.mockResolvedValue({
      id: 'p-1', nome: 'Produtor', cpf: null, telefone: null,
      parceiros: [{ id: 'pa-1', nome: payload, cpf: '000', percentual: 50 }],
      createdAt: new Date(),
    })
    const req = new NextRequest('http://localhost/api/produtores', {
      method: 'POST',
      body: JSON.stringify({ nome: 'Produtor', parceiros: [{ nome: payload, cpf: '000', percentual: 50 }] }),
    })
    const res = await postProdutor(req)
    const data = await res.json()
    if (res.status === 201) expect(data.parceiros[0].nome).toBe(payload)
    expect(res.headers.get('content-type')).toContain('application/json')
  })
})

// ─── 5. XSS via query parameter — GET /api/compras?q= ────────────────────────
describe('XSS via query param — GET /api/compras?q=', () => {
  it.each(XSS_PAYLOADS)('param q=%s não é refletido no body da resposta sem sanitização', async (payload) => {
    mockCompraFindMany.mockResolvedValue([])
    const url = `http://localhost/api/compras?q=${encodeURIComponent(payload)}`
    const req = new NextRequest(url)
    const res = await getCompras(req)
    expect(res.status).toBe(200)
    // O param q vai para Prisma `contains` — nunca é refletido diretamente no body
    const text = await res.text()
    expect(text).toBe('[]')
    expect(res.headers.get('content-type')).toContain('application/json')
  })
})

// ─── 6. XSS via PATCH — observacao em compras ────────────────────────────────
describe('XSS stored — PATCH /api/compras/[id] (observacao)', () => {
  it.each(XSS_PAYLOADS)('observacao: payload %s armazenado como string', async (payload) => {
    mockCompraUpdate.mockResolvedValue({ id: 'co-1', observacao: payload })
    const req = new NextRequest('http://localhost/api/compras/co-1', {
      method: 'PATCH',
      body: JSON.stringify({ observacao: payload }),
    })
    const res = await patchCompra(req, { params: Promise.resolve({ id: 'co-1' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.observacao).toBe(payload)
    expect(res.headers.get('content-type')).toContain('application/json')
  })
})

// ─── 7. Resposta JSON não executa tags HTML ───────────────────────────────────
describe('XSS — resposta JSON não contém HTML executável', () => {
  it('resposta nunca tem Content-Type text/html mesmo com payload HTML no body', async () => {
    mockClienteCreate.mockResolvedValue({ id: 'c-1', nome: '<h1>Injeção</h1>', createdAt: new Date() })
    const req = new NextRequest('http://localhost/api/clientes', {
      method: 'POST',
      body: JSON.stringify({ nome: '<h1>Injeção</h1>' }),
    })
    const res = await postCliente(req)
    const ct = res.headers.get('content-type') ?? ''
    expect(ct).not.toContain('text/html')
    expect(ct).toContain('application/json')
  })

  it('JSON.stringify nunca produz JS executável via payload de fechamento de string', async () => {
    const payload = '</script><script>alert(1)</script>'
    mockClienteCreate.mockResolvedValue({ id: 'c-1', nome: payload, createdAt: new Date() })
    const req = new NextRequest('http://localhost/api/clientes', {
      method: 'POST',
      body: JSON.stringify({ nome: payload }),
    })
    const res = await postCliente(req)
    const text = await res.text()
    // Deve ser JSON válido — parse não pode falhar
    expect(() => JSON.parse(text)).not.toThrow()
  })
})
