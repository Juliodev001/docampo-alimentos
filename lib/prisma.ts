import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/app/generated/prisma/client'
import { Prisma } from '@/app/generated/prisma/client'

// Garante que Decimal sempre serializa como número no JSON.
// Patcheia a classe Decimal que o PRÓPRIO runtime do Prisma usa
// (Prisma.Decimal), não o pacote standalone decimal.js — assim o
// JSON.stringify de QUALQUER rota retorna número em vez de { s, e, d }.
// Corrige o bug de [object Object] / NaN em TODOS os endpoints de uma vez.
try {
  const DecimalProto = (Prisma.Decimal as unknown as { prototype: { toJSON?: () => number; toNumber: () => number } }).prototype
  if (DecimalProto && typeof DecimalProto.toNumber === 'function') {
    DecimalProto.toJSON = function () { return this.toNumber() }
  }
} catch {
  // Prisma.Decimal indisponível — sem problema, lib/serialize.ts cobre as rotas principais
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    min: 0,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
