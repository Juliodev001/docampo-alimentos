// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

// O PUT sincroniza os meeiros: lê os atuais (prisma.parceiro), checa se algum
// removido tem movimento (counts) e grava tudo dentro de $transaction. O mock
// da transação repassa o próprio prisma como `tx` — a superfície é a mesma.
vi.mock('@/lib/prisma', () => {
  const prisma = {
    produtor: {
      findMany:   vi.fn(),
      findUnique: vi.fn(),
      create:     vi.fn(),
      update:     vi.fn(),
      delete:     vi.fn(),
      count:      vi.fn(),
    },
    parceiro: {
      findMany:   vi.fn(),
      create:     vi.fn(),
      update:     vi.fn(),
      deleteMany: vi.fn(),
    },
    colheitaDiaria: {
      updateMany: vi.fn(),
      count:      vi.fn(),
    },
    pagamentoMeeiro: {
      count: vi.fn(),
    },
    vale: {
      count: vi.fn(),
    },
    fechamentoMeeiro: {
      count: vi.fn(),
    },
    fechamentoPagamento: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => unknown) => cb(prisma))
  return { prisma }
})

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/mem-cache', () => ({ memCache: { fetch: vi.fn(), invalidate: vi.fn() } }))

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { memCache } from '@/lib/mem-cache'
import { GET, POST } from '@/app/api/produtores/route'
import { GET as GET_ID, PUT, DELETE } from '@/app/api/produtores/[id]/route'

const session = { userId: 'u-1', name: 'Admin', email: 'a@a.com', role: 'DONO', expiresAt: new Date() }

const mockProdutor = {
  id: 'prod-1',
  nome: 'João Silva',
  cpf: null,
  telefone: null,
  createdAt: new Date(),
  parceiros: [],
}

const makeReq = (body?: object) =>
  new NextRequest('http://localhost/api/produtores', {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })

const makeReqWithId = (method: string, body?: object) =>
  new NextRequest('http://localhost/api/produtores/prod-1', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })

const params = Promise.resolve({ id: 'prod-1' })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(memCache.invalidate).mockReturnValue(undefined)
  vi.mocked(prisma.produtor.count).mockResolvedValue(0)
  // findUnique retorna null por padrão (sem conflito de código/CPF)
  vi.mocked(prisma.produtor.findUnique).mockResolvedValue(null)
  vi.mocked(prisma.colheitaDiaria.updateMany).mockResolvedValue({ count: 0 })
  vi.mocked(prisma.fechamentoPagamento.deleteMany).mockResolvedValue({ count: 0 })
  // Produtor sem meeiros cadastrados e sem movimento é o caso base do PUT
  vi.mocked(prisma.parceiro.findMany).mockResolvedValue([])
  vi.mocked(prisma.colheitaDiaria.count).mockResolvedValue(0)
  vi.mocked(prisma.pagamentoMeeiro.count).mockResolvedValue(0)
  vi.mocked(prisma.vale.count).mockResolvedValue(0)
  vi.mocked(prisma.fechamentoMeeiro.count).mockResolvedValue(0)
})

// ─── GET /api/produtores ──────────────────────────────────────────────────────
describe('GET /api/produtores', () => {
  it('retorna 401 sem sessão', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    vi.mocked(memCache.fetch).mockResolvedValue([])
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('retorna lista de produtores autenticado', async () => {
    vi.mocked(getSession).mockResolvedValue(session)
    vi.mocked(memCache.fetch).mockResolvedValue([mockProdutor])
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data[0].nome).toBe('João Silva')
  })
})

// ─── POST /api/produtores ─────────────────────────────────────────────────────
describe('POST /api/produtores', () => {
  it('retorna 401 sem sessão', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await POST(makeReq({ nome: 'Teste' }))
    expect(res.status).toBe(401)
  })

  it('retorna 400 sem nome', async () => {
    vi.mocked(getSession).mockResolvedValue(session)
    const res = await POST(makeReq({ nome: '' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/obrigatório/i)
  })

  it('cria produtor sem CPF', async () => {
    vi.mocked(getSession).mockResolvedValue(session)
    vi.mocked(prisma.produtor.create).mockResolvedValue(mockProdutor as never)
    const res = await POST(makeReq({ nome: 'João Silva', parceiros: [] }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.nome).toBe('João Silva')
    expect(data.cpf).toBeNull()
  })

  it('cria produtor com CPF', async () => {
    vi.mocked(getSession).mockResolvedValue(session)
    vi.mocked(prisma.produtor.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.produtor.create).mockResolvedValue({ ...mockProdutor, cpf: '12345678901' } as never)
    const res = await POST(makeReq({ nome: 'João Silva', cpf: '12345678901', parceiros: [] }))
    expect(res.status).toBe(201)
  })

  it('retorna 400 com CPF duplicado', async () => {
    vi.mocked(getSession).mockResolvedValue(session)
    // Simula CPF já cadastrado
    vi.mocked(prisma.produtor.findUnique).mockResolvedValueOnce(mockProdutor as never)
    const res = await POST(makeReq({ nome: 'Outro', cpf: '12345678901', parceiros: [] }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/CPF/i)
  })

  it('cria produtor com parceiros sem CPF', async () => {
    vi.mocked(getSession).mockResolvedValue(session)
    const com = { ...mockProdutor, parceiros: [{ id: 'pa-1', nome: 'Lucas', cpf: null, percentual: 30 }] }
    vi.mocked(prisma.produtor.create).mockResolvedValue(com as never)
    const res = await POST(makeReq({ nome: 'João Silva', parceiros: [{ nome: 'Lucas', percentual: 30 }] }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.parceiros[0].nome).toBe('Lucas')
  })

  it('retorna 400 quando soma parceiros > 100%', async () => {
    vi.mocked(getSession).mockResolvedValue(session)
    const res = await POST(makeReq({
      nome: 'João',
      parceiros: [{ nome: 'A', percentual: 60 }, { nome: 'B', percentual: 50 }],
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/100%/i)
  })

  it('retorna 400 com percentual negativo', async () => {
    vi.mocked(getSession).mockResolvedValue(session)
    const res = await POST(makeReq({ nome: 'João', parceiros: [{ nome: 'A', percentual: -10 }] }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/inválido/i)
  })

  it('retorna 400 com body inválido', async () => {
    vi.mocked(getSession).mockResolvedValue(session)
    const req = new NextRequest('http://localhost/api/produtores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'não é json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('invalida cache ao criar', async () => {
    vi.mocked(getSession).mockResolvedValue(session)
    vi.mocked(prisma.produtor.create).mockResolvedValue(mockProdutor as never)
    await POST(makeReq({ nome: 'João', parceiros: [] }))
    expect(memCache.invalidate).toHaveBeenCalledWith('produtores')
  })
})

// ─── PUT /api/produtores/[id] ─────────────────────────────────────────────────
describe('PUT /api/produtores/[id]', () => {
  it('retorna 401 sem sessão', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await PUT(makeReqWithId('PUT', { nome: 'Novo', parceiros: [] }), { params })
    expect(res.status).toBe(401)
  })

  it('retorna 404 se produtor não existe', async () => {
    vi.mocked(getSession).mockResolvedValue(session)
    vi.mocked(prisma.produtor.findUnique).mockResolvedValue(null)
    const res = await PUT(makeReqWithId('PUT', { nome: 'Novo', parceiros: [] }), { params })
    expect(res.status).toBe(404)
  })

  it('atualiza produtor com sucesso', async () => {
    vi.mocked(getSession).mockResolvedValue(session)
    // 1ª chamada é o `existing`; a 2ª acontece dentro da transação e é o que a
    // rota devolve — por isso o nome novo só aparece na segunda.
    vi.mocked(prisma.produtor.findUnique)
      .mockResolvedValueOnce(mockProdutor as never)
      .mockResolvedValueOnce({ ...mockProdutor, nome: 'Novo Nome' } as never)
    vi.mocked(prisma.produtor.update).mockResolvedValue({ ...mockProdutor, nome: 'Novo Nome' } as never)
    const res = await PUT(makeReqWithId('PUT', { nome: 'Novo Nome', parceiros: [] }), { params })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.nome).toBe('Novo Nome')
  })

  it('recusa remover meeiro que já tem lançamentos', async () => {
    vi.mocked(getSession).mockResolvedValue(session)
    vi.mocked(prisma.produtor.findUnique).mockResolvedValueOnce(mockProdutor as never)
    vi.mocked(prisma.parceiro.findMany).mockResolvedValue([
      { id: 'pa-1', nome: 'Lucas' },
    ] as never)
    vi.mocked(prisma.colheitaDiaria.count).mockResolvedValue(3)
    // Lista sem o 'pa-1' → ele seria removido, mas tem colheitas no histórico
    const res = await PUT(makeReqWithId('PUT', { nome: 'João Silva', parceiros: [] }), { params })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Lucas/)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('retorna 400 quando soma parceiros > 100%', async () => {
    vi.mocked(getSession).mockResolvedValue(session)
    vi.mocked(prisma.produtor.findUnique).mockResolvedValue(mockProdutor as never)
    const res = await PUT(makeReqWithId('PUT', {
      nome: 'João',
      parceiros: [{ nome: 'A', percentual: 70 }, { nome: 'B', percentual: 60 }],
    }), { params })
    expect(res.status).toBe(400)
  })
})

// ─── DELETE /api/produtores/[id] ──────────────────────────────────────────────
describe('DELETE /api/produtores/[id]', () => {
  it('retorna 401 sem sessão', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await DELETE(makeReqWithId('DELETE'), { params })
    expect(res.status).toBe(401)
  })

  it('exclui produtor autenticado', async () => {
    vi.mocked(getSession).mockResolvedValue(session)
    vi.mocked(prisma.produtor.delete).mockResolvedValue(mockProdutor as never)
    const res = await DELETE(makeReqWithId('DELETE'), { params })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
  })

  it('chama delete com id correto', async () => {
    vi.mocked(getSession).mockResolvedValue(session)
    vi.mocked(prisma.produtor.delete).mockResolvedValue(mockProdutor as never)
    await DELETE(makeReqWithId('DELETE'), { params })
    expect(prisma.produtor.delete).toHaveBeenCalledWith({ where: { id: 'prod-1' } })
  })

  it('invalida cache ao excluir', async () => {
    vi.mocked(getSession).mockResolvedValue(session)
    vi.mocked(prisma.produtor.delete).mockResolvedValue(mockProdutor as never)
    await DELETE(makeReqWithId('DELETE'), { params })
    expect(memCache.invalidate).toHaveBeenCalledWith('produtores')
  })
})
