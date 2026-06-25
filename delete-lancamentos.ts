import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './app/generated/prisma/client'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter } as never)

async function main() {
  const [nL, nC] = await Promise.all([
    prisma.lancamentoCusto.count(),
    prisma.colheitaDiaria.count(),
  ])
  console.log(`Encontrados: LancamentoCusto=${nL}, ColheitaDiaria=${nC}`)

  const [delL, delC] = await Promise.all([
    prisma.lancamentoCusto.deleteMany({}),
    prisma.colheitaDiaria.deleteMany({}),
  ])

  console.log(`Deletados com sucesso: LancamentoCusto=${delL.count}, ColheitaDiaria=${delC.count}`)
}

main().catch(console.error).finally(() => pool.end())
