import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    colheitaDiaria: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    produtor: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/session', () => ({
  getSession: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { GET, POST } from '@/app/api/colheita/route'
import { NextRequest } from 'next/server'

const mockSession = { userId: 'user-123', expiresAt: new Date(), name: 'Test User', email: 'test@example.com', role: 'DONO' }

const mockColheita = {
  id: 'colheita-1',
  data: new Date('2026-05-06'),
  produtoId: 'produto-1',
  produtorId: null,
  percDono: 100,
  percParceiro: 0,
  quantidadeTotal: 100,
  quantidadeDono: 100,
  quantidadeParceiro: 0,
  responsavelId: 'user-123',
  observacao: null,
  createdAt: new Date(),
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/colheita', () => {
  it('retorna 401 sem sessão', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await GET(new NextRequest('http://localhost/api/colheita'))
    expect(res.status).toBe(401)
  })

  it('retorna lista de colheitas', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession)
    vi.mocked(prisma.colheitaDiaria.findMany).mockResolvedValue([mockColheita] as never)
    const res = await GET(new NextRequest('http://localhost/api/colheita'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data[0].quantidadeTotal).toBe(100)
  })
})

describe('POST /api/colheita', () => {
  it('retorna 401 sem sessão', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/colheita', {
      method: 'POST',
      body: JSON.stringify({ data: '2026-05-06', produtoId: 'p1', quantidadeTotal: 10 }),
    })
    expect((await POST(req)).status).toBe(401)
  })

  it('retorna 400 sem produtoId', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession)
    const req = new NextRequest('http://localhost/api/colheita', {
      method: 'POST',
      body: JSON.stringify({ data: '2026-05-06', quantidadeTotal: 10 }),
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('retorna 400 sem quantidadeTotal', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession)
    const req = new NextRequest('http://localhost/api/colheita', {
      method: 'POST',
      body: JSON.stringify({ data: '2026-05-06', produtoId: 'p1' }),
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('sem produtor: dono recebe 100% da colheita', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession)
    vi.mocked(prisma.colheitaDiaria.create).mockResolvedValue(mockColheita as never)

    const req = new NextRequest('http://localhost/api/colheita', {
      method: 'POST',
      body: JSON.stringify({ data: '2026-05-06', produtoId: 'produto-1', quantidadeTotal: 100 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(prisma.colheitaDiaria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quantidadeTotal: 100,
          quantidadeDono: 100,
          quantidadeParceiro: 0,
          percDono: 100,
          percParceiro: 0,
        }),
      })
    )
  })

  it('com produtor 60/40: divide corretamente', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession)
    vi.mocked(prisma.produtor.findUnique).mockResolvedValue({
      id: 'produtor-1',
      parceiros: [{ percentual: 40 }],
    } as never)
    vi.mocked(prisma.colheitaDiaria.create).mockResolvedValue({
      ...mockColheita, produtorId: 'produtor-1', percDono: 60, percParceiro: 40, quantidadeDono: 60, quantidadeParceiro: 40,
    } as never)

    const req = new NextRequest('http://localhost/api/colheita', {
      method: 'POST',
      body: JSON.stringify({ data: '2026-05-06', produtoId: 'produto-1', produtorId: 'produtor-1', quantidadeTotal: 100 }),
    })
    await POST(req)
    expect(prisma.colheitaDiaria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quantidadeDono: 60,
          quantidadeParceiro: 40,
          percDono: 60,
          percParceiro: 40,
        }),
      })
    )
  })

  it('com produtor 70/30: divide corretamente', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession)
    vi.mocked(prisma.produtor.findUnique).mockResolvedValue({
      id: 'produtor-2',
      parceiros: [{ percentual: 30 }],
    } as never)
    vi.mocked(prisma.colheitaDiaria.create).mockResolvedValue(mockColheita as never)

    const req = new NextRequest('http://localhost/api/colheita', {
      method: 'POST',
      body: JSON.stringify({ data: '2026-05-06', produtoId: 'produto-1', produtorId: 'produtor-2', quantidadeTotal: 100 }),
    })
    await POST(req)
    expect(prisma.colheitaDiaria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quantidadeDono: 70,
          quantidadeParceiro: 30,
          percDono: 70,
          percParceiro: 30,
        }),
      })
    )
  })

  it('produtor com múltiplos parceiros: soma os percentuais', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession)
    vi.mocked(prisma.produtor.findUnique).mockResolvedValue({
      id: 'produtor-3',
      parceiros: [{ percentual: 20 }, { percentual: 15 }],
    } as never)
    vi.mocked(prisma.colheitaDiaria.create).mockResolvedValue(mockColheita as never)

    const req = new NextRequest('http://localhost/api/colheita', {
      method: 'POST',
      body: JSON.stringify({ data: '2026-05-06', produtoId: 'produto-1', produtorId: 'produtor-3', quantidadeTotal: 100 }),
    })
    await POST(req)
    expect(prisma.colheitaDiaria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          percParceiro: 35,
          percDono: 65,
          quantidadeDono: 65,
          quantidadeParceiro: 35,
        }),
      })
    )
  })
})
