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
    // Uma conexão fica viva mesmo parada (o pool não a fecha por ociosidade):
    // a primeira consulta depois de uma pausa não paga o preço de abrir conexão
    // — TCP, TLS e autenticação — antes de responder. Com min 0 o pool esvaziava
    // e toda volta ao sistema recomeçava do zero.
    min: 1,
    max: 10,
    // Conexão parada é devolvida em 10 min, não em 30 s: o sistema tem picos
    // curtos de uso (um lançamento, um relatório) separados por minutos de
    // silêncio, e reabrir a cada pausa era puro atraso.
    idleTimeoutMillis: 600_000,
    // Se o pool está lotado, é melhor falhar em 8 s e mostrar erro do que deixar
    // a tela pendurada meio minuto por consulta esperando uma vaga.
    connectionTimeoutMillis: 8_000,
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

// O cliente vai no globalThis TAMBÉM em produção. O Next divide o servidor em
// vários bundles (as páginas num, as rotas de API noutro), e cada bundle carrega
// a sua cópia deste módulo: sem o global, cada cópia abria o seu próprio pool de
// até 10 conexões, multiplicando conexões no Postgres sem que nenhuma delas
// fosse reaproveitada. O globalThis é o único ponto que as cópias compartilham
// dentro do mesmo processo Node.
export const prisma = globalForPrisma.prisma || createPrismaClient()

globalForPrisma.prisma = prisma
