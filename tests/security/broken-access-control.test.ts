// @vitest-environment node
/**
 * Broken Access Control
 *
 * Testa que operações privilegiadas exigem role DONO, não apenas autenticação.
 * Os 3 vetores encontrados na auditoria de pentesting:
 *
 *  1. PATCH /api/usuarios/[id] — escalada de privilégio (role change)
 *  2. POST  /api/usuarios      — criação de usuário DONO por não-administrador
 *  3. GET   /api/lgpd/export   — exportação de PII sem restrição de role
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))
vi.mock('@/lib/mem-cache', () => ({
  memCache: { fetch: vi.fn((_, fn: () => unknown) => fn()), invalidate: vi.fn() },
}))
vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('$2b$10$hashed'), compare: vi.fn() },
}))

const {
  mockUserUpdate, mockUserFindUnique, mockUserCreate, mockUserFindMany,
  mockProdutorFindFirst, mockParceiroFindFirst, mockClienteFindFirst, mockFornecedorFindFirst,
} = vi.hoisted(() => ({
  mockUserUpdate:          vi.fn(),
  mockUserFindUnique:      vi.fn().mockResolvedValue(null),
  mockUserCreate:          vi.fn(),
  mockUserFindMany:        vi.fn().mockResolvedValue([]),
  mockProdutorFindFirst:   vi.fn().mockResolvedValue(null),
  mockParceiroFindFirst:   vi.fn().mockResolvedValue(null),
  mockClienteFindFirst:    vi.fn().mockResolvedValue(null),
  mockFornecedorFindFirst: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user:     { update: mockUserUpdate, findUnique: mockUserFindUnique, create: mockUserCreate, findMany: mockUserFindMany },
    produtor:   { findFirst: mockProdutorFindFirst },
    parceiro:   { findFirst: mockParceiroFindFirst },
    cliente:    { findFirst: mockClienteFindFirst },
    fornecedor: { findFirst: mockFornecedorFindFirst },
  },
}))

import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { PATCH as patchUsuario } from '@/app/api/usuarios/[id]/route'
import { GET as getUsuarios, POST as postUsuario } from '@/app/api/usuarios/route'
import { GET as getLgpdExport } from '@/app/api/lgpd/export/route'

const sessaoDono    = { userId: 'u-dono', name: 'Dono', email: 'dono@app.com', role: 'DONO',    expiresAt: new Date() }
const sessaoGerente = { userId: 'u-ger',  name: 'Gerente', email: 'ger@app.com', role: 'GERENTE', expiresAt: new Date() }

const usuarioMock = { id: 'u-1', name: 'João', email: 'joao@app.com', role: 'GERENTE', ativo: true }

beforeEach(() => {
  vi.clearAllMocks()
  mockUserFindUnique.mockResolvedValue(null)
})

// ─── 1. PATCH /api/usuarios/[id] — escalada de privilégio ────────────────────

describe('Broken Access Control — PATCH /api/usuarios/[id] (role escalation)', () => {
  it('DONO pode alterar role de outro usuário', async () => {
    vi.mocked(getSession).mockResolvedValue(sessaoDono)
    mockUserUpdate.mockResolvedValue({ ...usuarioMock, role: 'DONO' })
    const req = new NextRequest('http://localhost/api/usuarios/u-1', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'DONO' }),
    })
    const res = await patchUsuario(req, { params: Promise.resolve({ id: 'u-1' }) })
    expect(res.status).toBe(200)
    expect(mockUserUpdate).toHaveBeenCalled()
  })

  it('GERENTE NÃO pode alterar role → 403', async () => {
    vi.mocked(getSession).mockResolvedValue(sessaoGerente)
    const req = new NextRequest('http://localhost/api/usuarios/u-1', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'DONO' }),
    })
    const res = await patchUsuario(req, { params: Promise.resolve({ id: 'u-1' }) })
    expect(res.status).toBe(403)
    expect(mockUserUpdate).not.toHaveBeenCalled()
  })

  it('GERENTE NÃO pode desativar outro usuário → 403', async () => {
    vi.mocked(getSession).mockResolvedValue(sessaoGerente)
    const req = new NextRequest('http://localhost/api/usuarios/u-outro', {
      method: 'PATCH',
      body: JSON.stringify({ ativo: false }),
    })
    const res = await patchUsuario(req, { params: Promise.resolve({ id: 'u-outro' }) })
    expect(res.status).toBe(403)
    expect(mockUserUpdate).not.toHaveBeenCalled()
  })

  it('sem sessão → 401', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/usuarios/u-1', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'DONO' }),
    })
    const res = await patchUsuario(req, { params: Promise.resolve({ id: 'u-1' }) })
    expect(res.status).toBe(401)
    expect(mockUserUpdate).not.toHaveBeenCalled()
  })
})

// ─── 2. POST /api/usuarios — criação de conta ────────────────────────────────

describe('Broken Access Control — POST /api/usuarios (criação de usuário)', () => {
  it('DONO pode criar usuário GERENTE', async () => {
    vi.mocked(getSession).mockResolvedValue(sessaoDono)
    mockUserCreate.mockResolvedValue({ id: 'u-new', name: 'Novo', email: 'novo@app.com', role: 'GERENTE', ativo: true, createdAt: new Date() })
    const req = new NextRequest('http://localhost/api/usuarios', {
      method: 'POST',
      body: JSON.stringify({ name: 'Novo', email: 'novo@app.com', password: 'Senha@123', role: 'GERENTE' }),
    })
    const res = await postUsuario(req)
    expect(res.status).toBe(201)
    expect(mockUserCreate).toHaveBeenCalled()
  })

  it('DONO tenta criar outro DONO → role rebaixada para GERENTE', async () => {
    vi.mocked(getSession).mockResolvedValue(sessaoDono)
    mockUserCreate.mockResolvedValue({ id: 'u-new', name: 'Novo', email: 'novo@app.com', role: 'GERENTE', ativo: true, createdAt: new Date() })
    const req = new NextRequest('http://localhost/api/usuarios', {
      method: 'POST',
      body: JSON.stringify({ name: 'Novo', email: 'novo@app.com', password: 'Senha@123', role: 'DONO' }),
    })
    const res = await postUsuario(req)
    expect(res.status).toBe(201)
    // role deve ter sido rebaixada para GERENTE
    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'GERENTE' }) })
    )
  })

  it('GERENTE NÃO pode criar usuário → 403', async () => {
    vi.mocked(getSession).mockResolvedValue(sessaoGerente)
    const req = new NextRequest('http://localhost/api/usuarios', {
      method: 'POST',
      body: JSON.stringify({ name: 'Novo', email: 'novo@app.com', password: 'Senha@123' }),
    })
    const res = await postUsuario(req)
    expect(res.status).toBe(403)
    expect(mockUserCreate).not.toHaveBeenCalled()
  })

  it('GERENTE NÃO pode criar conta DONO → 403 (ataque de escalada)', async () => {
    vi.mocked(getSession).mockResolvedValue(sessaoGerente)
    const req = new NextRequest('http://localhost/api/usuarios', {
      method: 'POST',
      body: JSON.stringify({ name: 'Hacker', email: 'hacker@evil.com', password: 'Senha@123', role: 'DONO' }),
    })
    const res = await postUsuario(req)
    expect(res.status).toBe(403)
    expect(mockUserCreate).not.toHaveBeenCalled()
  })

  it('sem sessão NÃO pode criar usuário → 401', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/usuarios', {
      method: 'POST',
      body: JSON.stringify({ name: 'Novo', email: 'novo@app.com', password: 'Senha@123' }),
    })
    const res = await postUsuario(req)
    expect(res.status).toBe(401)
    expect(mockUserCreate).not.toHaveBeenCalled()
  })
})

// ─── 3. GET /api/lgpd/export — exportação de PII ─────────────────────────────

describe('Broken Access Control — GET /api/lgpd/export (PII)', () => {
  const urlComCpf = 'http://localhost/api/lgpd/export?cpf=12345678900'

  it('DONO pode exportar dados LGPD', async () => {
    vi.mocked(getSession).mockResolvedValue(sessaoDono)
    // Nenhum registro encontrado — retorna 404 mas não 403
    const res = await getLgpdExport(new NextRequest(urlComCpf))
    expect([200, 404]).toContain(res.status)
    expect(res.status).not.toBe(403)
  })

  it('GERENTE NÃO pode exportar dados LGPD → 403', async () => {
    vi.mocked(getSession).mockResolvedValue(sessaoGerente)
    const res = await getLgpdExport(new NextRequest(urlComCpf))
    expect(res.status).toBe(403)
    // Nenhuma query de PII deve ter sido executada
    expect(mockProdutorFindFirst).not.toHaveBeenCalled()
    expect(mockClienteFindFirst).not.toHaveBeenCalled()
    expect(mockFornecedorFindFirst).not.toHaveBeenCalled()
    expect(mockParceiroFindFirst).not.toHaveBeenCalled()
  })

  it('sem sessão NÃO pode exportar dados LGPD → 401', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await getLgpdExport(new NextRequest(urlComCpf))
    expect(res.status).toBe(401)
    expect(mockProdutorFindFirst).not.toHaveBeenCalled()
  })

  it('resposta do GERENTE não vaza dados de PII no body do erro', async () => {
    vi.mocked(getSession).mockResolvedValue(sessaoGerente)
    const res = await getLgpdExport(new NextRequest(urlComCpf))
    const body = await res.text()
    const parsed = JSON.parse(body)
    // Corpo do 403 não deve conter campos de PII
    expect(parsed).not.toHaveProperty('cpfCnpj')
    expect(parsed).not.toHaveProperty('telefone')
    expect(parsed).not.toHaveProperty('dados')
  })
})
