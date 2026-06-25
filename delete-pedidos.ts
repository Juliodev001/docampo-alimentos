import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './app/generated/prisma/client'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter } as never)

async function main() {
  const [nPedidos, nEstoque] = await Promise.all([
    prisma.pedido.count(),
    prisma.entradaEstoque.count({ where: { observacao: { startsWith: 'Venda PDV' } } }),
  ])
  console.log(`Encontrados: Pedidos=${nPedidos}, Baixas de estoque PDV=${nEstoque}`)

  // Deleta baixas de estoque geradas pelas vendas PDV
  const delEstoque = await prisma.entradaEstoque.deleteMany({
    where: { observacao: { startsWith: 'Venda PDV' } },
  })

  // Deleta todos os pedidos (ItemPedido é cascade)
  const delPedidos = await prisma.pedido.deleteMany({})

  console.log(`Deletados com sucesso: Pedidos=${delPedidos.count}, Baixas estoque=${delEstoque.count}`)
}

main().catch(console.error).finally(() => pool.end())
