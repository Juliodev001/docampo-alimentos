import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed-password') },
}))

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { GET, POST } from '@/app/api/usuarios/route'
import { NextRequest } from 'next/server'

const mockSession = { userId: 'user-123', expiresAt: new Date(), name: 'Test User', email: 'test@example.com', role: 'DONO' }
const mockUser = {
  id: 'user-123', name: 'Admin', email: 'admin@docampo.com.br',
  role: 'DONO', ativo: true, createdAt: new Date(),
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/usuarios', () => {
  it('retorna 401 sem sessão', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('retorna lista de usuários sem expor senha', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession)
    vi.mocked(prisma.user.findMany).mockResolvedValue([mockUser] as never)
    const res = await GET()
    const data = await res.json()
    expect(data[0]).not.toHaveProperty('password')
    expect(data[0].role).toBe('DONO')
  })
})

describe('POST /api/usuarios', () => {
  it('retorna 401 sem sessão', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/usuarios', {
      method: 'POST',
      body: JSON.stringify({ name: 'João', email: 'j@j.com', password: '123456' }),
    })
    expect((await POST(req)).status).toBe(401)
  })

  it('retorna 400 sem campos obrigatórios', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession)
    const req = new NextRequest('http://localhost/api/usuarios', {
      method: 'POST',
      body: JSON.stringify({ name: 'João' }),
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('retorna 409 com e-mail duplicado', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    const req = new NextRequest('http://localhost/api/usuarios', {
      method: 'POST',
      body: JSON.stringify({ name: 'João', email: 'admin@docampo.com.br', password: '123456' }),
    })
    expect((await POST(req)).status).toBe(409)
  })

  it('cria usuário com perfil GERENTE por padrão', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue({ ...mockUser, role: 'GERENTE' } as never)
    const req = new NextRequest('http://localhost/api/usuarios', {
      method: 'POST',
      body: JSON.stringify({ name: 'João', email: 'joao@test.com', password: '123456' }),
    })
    await POST(req)
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'GERENTE' }) })
    )
  })

  it('cria usuário com perfil PARCEIRO quando especificado', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue({ ...mockUser, role: 'PARCEIRO' } as never)
    const req = new NextRequest('http://localhost/api/usuarios', {
      method: 'POST',
      body: JSON.stringify({ name: 'Parceiro', email: 'p@test.com', password: '123456', role: 'PARCEIRO' }),
    })
    await POST(req)
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'PARCEIRO' }) })
    )
  })

  it('senha nunca é armazenada em texto puro', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue(mockUser as never)
    const req = new NextRequest('http://localhost/api/usuarios', {
      method: 'POST',
      body: JSON.stringify({ name: 'João', email: 'joao@test.com', password: 'senha-texto-puro' }),
    })
    await POST(req)
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ password: 'hashed-password' }),
      })
    )
  })
})
