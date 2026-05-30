import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    produto: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/session', () => ({
  getSession: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { GET, POST } from '@/app/api/produtos/route'
import { NextRequest } from 'next/server'

const mockSession = { userId: 'user-123', expiresAt: new Date(), name: 'Test User', email: 'test@example.com', role: 'DONO' }
const mockProduto = { id: 'p-1', nome: 'Morango', unidade: 'CAIXA', categoria: 'Fruta', ativo: true, createdAt: new Date() }

beforeEach(() => vi.clearAllMocks())

describe('GET /api/produtos', () => {
  it('retorna 401 sem sessão', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('retorna array de produtos', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession)
    vi.mocked(prisma.produto.findMany).mockResolvedValue([mockProduto] as never)
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data[0].nome).toBe('Morango')
  })

  it('retorna array vazio quando não há produtos', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession)
    vi.mocked(prisma.produto.findMany).mockResolvedValue([] as never)
    const res = await GET()
    const data = await res.json()
    expect(data).toEqual([])
  })
})

describe('POST /api/produtos', () => {
  it('retorna 401 sem sessão', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/produtos', {
      method: 'POST',
      body: JSON.stringify({ nome: 'Morango', unidade: 'CAIXA' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('retorna 400 sem nome', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession)
    const req = new NextRequest('http://localhost/api/produtos', {
      method: 'POST',
      body: JSON.stringify({ unidade: 'CAIXA' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('cria produto com sucesso e retorna 201', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession)
    vi.mocked(prisma.produto.create).mockResolvedValue(mockProduto as never)
    const req = new NextRequest('http://localhost/api/produtos', {
      method: 'POST',
      body: JSON.stringify({ nome: 'Morango', unidade: 'CAIXA', categoria: 'Fruta' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.nome).toBe('Morango')
  })

  it('usa unidade padrão CAIXA quando não informada', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession)
    vi.mocked(prisma.produto.create).mockResolvedValue(mockProduto as never)
    const req = new NextRequest('http://localhost/api/produtos', {
      method: 'POST',
      body: JSON.stringify({ nome: 'Tomate' }),
    })
    await POST(req)
    expect(prisma.produto.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ unidade: 'CAIXA' }) })
    )
  })
})
