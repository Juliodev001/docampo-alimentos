import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './app/generated/prisma/client'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter } as never)

async function main() {
  const n = await prisma.entradaEstoque.count()
  console.log(`Encontrados: EntradaEstoque=${n}`)

  const del = await prisma.entradaEstoque.deleteMany({})
  console.log(`Deletados com sucesso: EntradaEstoque=${del.count}`)
}

main().catch(console.error).finally(() => pool.end())
