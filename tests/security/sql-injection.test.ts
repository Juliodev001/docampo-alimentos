// @vitest-environment node
/**
 * Testes de SQL Injection
 *
 * O Prisma ORM usa queries parametrizadas em todas as operações. Qualquer string
 * enviada pelo usuário é passada como parâmetro ($1, $2…) — nunca interpolada
 * diretamente no SQL. Estes testes documentam essa garantia para os principais
 * vetores de ataque: campos de texto, parâmetros de URL, path params e campos
 * numéricos.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))
vi.mock('@/lib/mem-cache', () => ({
  memCache: { fetch: vi.fn((_, fn: () => unknown) => fn()), invalidate: vi.fn() },
}))
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))

const {
  mockClienteCreate, mockClienteUpdate, mockClienteDelete,
  mockFornecedorCreate, mockFornecedorUpdate, mockFornecedorDelete, mockFornecedorFindFirst,
  mockRocaCreate, mockRocaUpdate, mockRocaDelete, mockRocaCount, mockRocaFindUnique,
  mockColheitaUpdateMany,
  mockTransportadoraCreate,
  mockCompraFindMany,
} = vi.hoisted(() => ({
  mockClienteCreate:       vi.fn(),
  mockClienteUpdate:       vi.fn(),
  mockClienteDelete:       vi.fn(),
  mockFornecedorCreate:    vi.fn(),
  mockFornecedorUpdate:    vi.fn(),
  mockFornecedorDelete:    vi.fn(),
  mockFornecedorFindFirst: vi.fn(),
  mockRocaCreate:          vi.fn(),
  mockRocaUpdate:          vi.fn(),
  mockRocaDelete:          vi.fn(),
  mockRocaCount:           vi.fn().mockResolvedValue(0),
  mockRocaFindUnique:      vi.fn().mockResolvedValue(null),
  mockColheitaUpdateMany:  vi.fn().mockResolvedValue({ count: 0 }),
  mockTransportadoraCreate: vi.fn(),
  mockCompraFindMany:      vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    cliente:        { create: mockClienteCreate, update: mockClienteUpdate, delete: mockClienteDelete },
    fornecedor:     { create: mockFornecedorCreate, update: mockFornecedorUpdate, delete: mockFornecedorDelete, findFirst: mockFornecedorFindFirst },
    controleRoca:   { create: mockRocaCreate, update: mockRocaUpdate, delete: mockRocaDelete, count: mockRocaCount, findUnique: mockRocaFindUnique },
    colheitaDiaria: { updateMany: mockColheitaUpdateMany },
    transportadora: { create: mockTransportadoraCreate },
    compra:         { findMany: mockCompraFindMany },
  },
}))

import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { POST as postCliente }        from '@/app/api/clientes/route'
import { PUT as putCliente, DELETE as deleteCliente } from '@/app/api/clientes/[id]/route'
import { POST as postFornecedor }     from '@/app/api/fornecedores/route'
import { PUT as putFornecedor, DELETE as deleteFornecedor } from '@/app/api/fornecedores/[id]/route'
import { POST as postRoca }           from '@/app/api/rocas/route'
import { PUT as putRoca, DELETE as deleteRoca } from '@/app/api/rocas/[id]/route'
import { POST as postTransportadora } from '@/app/api/transportadoras/route'
import { GET as getCompras }          from '@/app/api/compras/route'

const mockSession = {
  userId: 'user-1',
  name: 'Admin',
  email: 'admin@test.com',
  role: 'DONO',
  expiresAt: new Date(),
}

const mockCliente = {
  id: 'c-1', nome: 'Cliente', tipo: 'FISICA', cnpjCpf: null,
  inscricaoEstadual: null, telefone: null, email: null,
  _count: { nfes: 0, romaneios: 0 }, enderecos: [], contatos: [],
  ativo: true, createdAt: new Date(),
}

const mockFornecedor = {
  id: 'f-1', nome: 'Fornecedor', tipo: 'JURIDICA', cnpjCpf: null,
  inscricaoEstadual: null, telefone: null, email: null, ativo: true,
  _count: { compras: 0, nfes: 0 }, enderecos: [], contatos: [],
  createdAt: new Date(),
}

const mockRoca = {
  id: 'r-1', codigo: 'R001', nome: 'Roça', area: null, localizacao: null,
  mudasPlantadas: null, cultura: null, produtorId: null, status: 'ATIVA',
  dataPlantio: null, dataColheita: null, observacao: null,
  produtor: null, registros: [], createdAt: new Date(),
}

// Payloads clássicos de SQL injection
const SQL_PAYLOADS = [
  "'; DROP TABLE clientes; --",
  "' OR '1'='1",
  "1; SELECT * FROM information_schema.tables--",
  "' UNION SELECT null, table_name FROM information_schema.tables--",
  "admin'--",
  "' OR sleep(5)--",
  "'; EXEC xp_cmdshell('whoami')--",
  "1' AND '1'='1",
  "' OR 1=1 LIMIT 1 OFFSET 0--",
  "\\x27 OR 1=1--",
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSession).mockResolvedValue(mockSession)
  mockRocaCount.mockResolvedValue(0)
  mockRocaFindUnique.mockResolvedValue(null)
  mockColheitaUpdateMany.mockResolvedValue({ count: 0 })
})

// ─── 1. Campos de texto — POST (create) ──────────────────────────────────────

describe('SQL Injection — POST /api/clientes (campos de texto)', () => {
  it.each(SQL_PAYLOADS)('nome="%s" é passado ao Prisma como string literal', async (payload) => {
    mockClienteCreate.mockResolvedValue({ ...mockCliente, nome: payload })
    const req = new NextRequest('http://localhost/api/clientes', {
      method: 'POST',
      body: JSON.stringify({ nome: payload }),
    })
    const res = await postCliente(req)
    expect(res.status).toBe(201)
    // Prisma recebe o payload como parâmetro — nunca como SQL bruto
    expect(mockClienteCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ nome: payload.trim() }) })
    )
    // Resposta é JSON válido, sem mensagem de erro SQL
    const text = await res.text()
    expect(() => JSON.parse(text)).not.toThrow()
  })

  it.each(SQL_PAYLOADS)('cnpjCpf="%s" é passado ao Prisma como string literal', async (payload) => {
    mockClienteCreate.mockResolvedValue({ ...mockCliente, cnpjCpf: payload })
    const req = new NextRequest('http://localhost/api/clientes', {
      method: 'POST',
      body: JSON.stringify({ nome: 'Cliente Teste', cnpjCpf: payload }),
    })
    const res = await postCliente(req)
    expect(res.status).toBe(201)
    expect(mockClienteCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cnpjCpf: payload }) })
    )
  })

  it.each(SQL_PAYLOADS)('enderecos[0].logradouro="%s" é passado ao Prisma como string literal', async (payload) => {
    mockClienteCreate.mockResolvedValue(mockCliente)
    const req = new NextRequest('http://localhost/api/clientes', {
      method: 'POST',
      body: JSON.stringify({
        nome: 'Cliente',
        enderecos: [{ logradouro: payload, cidade: 'SP', estado: 'SP' }],
      }),
    })
    const res = await postCliente(req)
    expect(res.status).toBe(201)
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

  it.each(SQL_PAYLOADS)('contatos[0].email="%s" é passado ao Prisma como string literal', async (payload) => {
    mockClienteCreate.mockResolvedValue(mockCliente)
    const req = new NextRequest('http://localhost/api/clientes', {
      method: 'POST',
      body: JSON.stringify({
        nome: 'Cliente',
        contatos: [{ email: payload, telefone: '11999999999' }],
      }),
    })
    const res = await postCliente(req)
    expect(res.status).toBe(201)
    expect(mockClienteCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contatos: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ email: payload }),
            ]),
          }),
        }),
      })
    )
  })
})

describe('SQL Injection — POST /api/fornecedores (campos de texto)', () => {
  it.each(SQL_PAYLOADS)('nome="%s" é passado ao Prisma como string literal', async (payload) => {
    mockFornecedorCreate.mockResolvedValue({ ...mockFornecedor, nome: payload })
    const req = new NextRequest('http://localhost/api/fornecedores', {
      method: 'POST',
      body: JSON.stringify({ nome: payload }),
    })
    const res = await postFornecedor(req)
    expect(res.status).toBe(201)
    expect(mockFornecedorCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ nome: payload.trim() }) })
    )
    const text = await res.text()
    expect(() => JSON.parse(text)).not.toThrow()
  })
})

describe('SQL Injection — POST /api/rocas (campos de texto e numéricos)', () => {
  it.each(SQL_PAYLOADS)('nome="%s" é passado ao Prisma como string literal', async (payload) => {
    mockRocaCreate.mockResolvedValue({ ...mockRoca, nome: payload })
    const req = new NextRequest('http://localhost/api/rocas', {
      method: 'POST',
      body: JSON.stringify({ nome: payload }),
    })
    const res = await postRoca(req)
    expect(res.status).toBe(201)
    expect(mockRocaCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ nome: payload }) })
    )
  })

  it.each(SQL_PAYLOADS)('localizacao="%s" é passado ao Prisma como string literal', async (payload) => {
    mockRocaCreate.mockResolvedValue(mockRoca)
    const req = new NextRequest('http://localhost/api/rocas', {
      method: 'POST',
      body: JSON.stringify({ nome: 'Roça A', localizacao: payload }),
    })
    const res = await postRoca(req)
    expect(res.status).toBe(201)
    expect(mockRocaCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ localizacao: payload }) })
    )
  })

  it.each(SQL_PAYLOADS)('observacao="%s" é passado ao Prisma como string literal', async (payload) => {
    mockRocaCreate.mockResolvedValue(mockRoca)
    const req = new NextRequest('http://localhost/api/rocas', {
      method: 'POST',
      body: JSON.stringify({ nome: 'Roça A', observacao: payload }),
    })
    const res = await postRoca(req)
    expect(res.status).toBe(201)
    expect(mockRocaCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ observacao: payload }) })
    )
  })

  it.each(SQL_PAYLOADS)(
    'area="%s" (campo numérico) passa por parseFloat — string SQL nunca chega ao banco',
    async (payload) => {
      mockRocaCreate.mockResolvedValue(mockRoca)
      const req = new NextRequest('http://localhost/api/rocas', {
        method: 'POST',
        body: JSON.stringify({ nome: 'Roça A', area: payload }),
      })
      const res = await postRoca(req)
      // parseFloat converte a string para number (ou NaN) — o payload SQL nunca chega ao banco
      expect([201, 400, 500]).toContain(res.status)
      if (mockRocaCreate.mock.calls.length > 0) {
        const areaPassada = mockRocaCreate.mock.calls[0][0].data.area
        // Deve ser number (incluindo NaN) — nunca a string SQL literal
        expect(typeof areaPassada).toBe('number')
        expect(areaPassada).not.toBe(payload)
      }
    }
  )
})

describe('SQL Injection — POST /api/transportadoras (body passado diretamente)', () => {
  it.each(SQL_PAYLOADS)('nome="%s" é passado ao Prisma como string literal', async (payload) => {
    mockTransportadoraCreate.mockResolvedValue({ id: 't-1', nome: payload, createdAt: new Date() })
    const req = new NextRequest('http://localhost/api/transportadoras', {
      method: 'POST',
      body: JSON.stringify({ nome: payload }),
    })
    const res = await postTransportadora(req)
    expect(res.status).toBe(201)
    expect(mockTransportadoraCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ nome: payload }) })
    )
    const text = await res.text()
    expect(() => JSON.parse(text)).not.toThrow()
  })
})

// ─── 2. Path parameters (ID na URL) ──────────────────────────────────────────

describe('SQL Injection — path param `id` (PUT /api/clientes/[id])', () => {
  it.each(SQL_PAYLOADS)(
    'id="%s" é tratado como string no where clause, não como SQL',
    async (payload) => {
      mockClienteUpdate.mockResolvedValue(mockCliente)
      const req = new NextRequest(`http://localhost/api/clientes/${encodeURIComponent(payload)}`, {
        method: 'PUT',
        body: JSON.stringify({ nome: 'Nome Atualizado' }),
      })
      const res = await putCliente(req, { params: Promise.resolve({ id: payload }) })
      // Prisma recebe o payload como parâmetro WHERE id = $1 — nunca como SQL
      expect(mockClienteUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: payload } })
      )
      // Resposta é JSON válido sem vazamento de erro SQL
      const text = await res.text()
      expect(() => JSON.parse(text)).not.toThrow()
      expect(text).not.toMatch(/syntax error|sql|pg_/i)
    }
  )
})

describe('SQL Injection — path param `id` (DELETE /api/clientes/[id])', () => {
  it.each(SQL_PAYLOADS)(
    'id="%s" é tratado como string no where clause, não como SQL',
    async (payload) => {
      mockClienteDelete.mockResolvedValue(mockCliente)
      const req = new NextRequest(`http://localhost/api/clientes/${encodeURIComponent(payload)}`, {
        method: 'DELETE',
      })
      const res = await deleteCliente(req, { params: Promise.resolve({ id: payload }) })
      expect(mockClienteDelete).toHaveBeenCalledWith({ where: { id: payload } })
      const text = await res.text()
      expect(() => JSON.parse(text)).not.toThrow()
      expect(text).not.toMatch(/syntax error|sql|pg_/i)
    }
  )
})

describe('SQL Injection — path param `id` (PUT /api/fornecedores/[id])', () => {
  it.each(SQL_PAYLOADS)(
    'id="%s" é tratado como string no where clause, não como SQL',
    async (payload) => {
      mockFornecedorUpdate.mockResolvedValue(mockFornecedor)
      const req = new NextRequest(`http://localhost/api/fornecedores/${encodeURIComponent(payload)}`, {
        method: 'PUT',
        body: JSON.stringify({ nome: 'Atualizado' }),
      })
      const res = await putFornecedor(req, { params: Promise.resolve({ id: payload }) })
      expect(mockFornecedorUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: payload } })
      )
      const text = await res.text()
      expect(() => JSON.parse(text)).not.toThrow()
    }
  )
})

describe('SQL Injection — path param `id` (DELETE /api/rocas/[id])', () => {
  it.each(SQL_PAYLOADS)(
    'id="%s" é tratado como string no where clause, não como SQL',
    async (payload) => {
      mockRocaDelete.mockResolvedValue(mockRoca)
      const req = new NextRequest(`http://localhost/api/rocas/${encodeURIComponent(payload)}`, {
        method: 'DELETE',
      })
      const res = await deleteRoca(req, { params: Promise.resolve({ id: payload }) })
      // updateMany e delete recebem o payload como parâmetro
      expect(mockColheitaUpdateMany).toHaveBeenCalledWith({ where: { rocaId: payload }, data: { rocaId: null } })
      expect(mockRocaDelete).toHaveBeenCalledWith({ where: { id: payload } })
      const text = await res.text()
      expect(() => JSON.parse(text)).not.toThrow()
    }
  )
})

// ─── 3. Query string (parâmetros de busca) ────────────────────────────────────

describe('SQL Injection — query param ?q= (GET /api/compras)', () => {
  it.each(SQL_PAYLOADS)(
    'q="%s" vai para Prisma contains — nunca interpolado no SQL',
    async (payload) => {
      mockCompraFindMany.mockResolvedValue([])
      const url = `http://localhost/api/compras?q=${encodeURIComponent(payload)}`
      const res = await getCompras(new NextRequest(url))
      expect(res.status).toBe(200)
      // Prisma recebeu o payload dentro de { contains: payload } — parameterizado
      expect(mockCompraFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ fornecedor: { nome: { contains: payload, mode: 'insensitive' } } }),
            ]),
          }),
        })
      )
      // Resposta não reflete o payload como SQL executado
      const text = await res.text()
      expect(text).toBe('[]')
    }
  )
})

describe('SQL Injection — query param ?de= e ?ate= (GET /api/compras)', () => {
  it.each(SQL_PAYLOADS)(
    'de="%s" passa por new Date() → Invalid Date, nunca executa SQL',
    async (payload) => {
      mockCompraFindMany.mockResolvedValue([])
      const url = `http://localhost/api/compras?de=${encodeURIComponent(payload)}`
      const res = await getCompras(new NextRequest(url))
      // Seja 200 ou 500, o servidor não deve vazar mensagem de erro SQL
      const text = await res.text()
      expect(text).not.toMatch(/syntax error near|DROP TABLE|information_schema/i)
    }
  )
})

// ─── 4. Garantia de Content-Type — respostas nunca são HTML ──────────────────

describe('SQL Injection — respostas são sempre application/json', () => {
  it('POST /api/clientes nunca retorna text/html mesmo com payload SQL no body', async () => {
    const payload = "'; DROP TABLE clientes; --"
    mockClienteCreate.mockResolvedValue({ ...mockCliente, nome: payload })
    const req = new NextRequest('http://localhost/api/clientes', {
      method: 'POST',
      body: JSON.stringify({ nome: payload }),
    })
    const res = await postCliente(req)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(res.headers.get('content-type')).not.toContain('text/html')
  })

  it('POST /api/fornecedores nunca retorna text/html mesmo com payload SQL no body', async () => {
    const payload = "' UNION SELECT username, password FROM users--"
    mockFornecedorCreate.mockResolvedValue({ ...mockFornecedor, nome: payload })
    const req = new NextRequest('http://localhost/api/fornecedores', {
      method: 'POST',
      body: JSON.stringify({ nome: payload }),
    })
    const res = await postFornecedor(req)
    expect(res.headers.get('content-type')).toContain('application/json')
  })

  it('GET /api/compras?q= nunca retorna text/html com payload SQL no query', async () => {
    mockCompraFindMany.mockResolvedValue([])
    const payload = "' OR 1=1--"
    const url = `http://localhost/api/compras?q=${encodeURIComponent(payload)}`
    const res = await getCompras(new NextRequest(url))
    expect(res.headers.get('content-type')).toContain('application/json')
  })
})
