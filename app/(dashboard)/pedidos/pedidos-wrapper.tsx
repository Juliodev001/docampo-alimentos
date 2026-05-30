'use client'
import { useState } from 'react'
import PdvClient from './pdv-client'
import PedidosClient from './pedidos-client'

const NAVY = '#2d3561'

type Tab = 'pdv' | 'pedidos'

type Produto = { id: string; nome: string; precoVenda: number; precoPromocional: number; precoPdv: number; unidade: string; categoria: string | null; ativo: boolean; estoque: number }
type Cliente = { id: string; nome: string }
type Fornecedor = { id: string; nome: string }
type ProdutoSimples = { id: string; nome: string; unidade: string }

type ItemPedido = { id?: string; produto: string; unidade: string; quantidade: number; valorUnit: number; desconto: number; total: number }
type Pedido = {
  id: string; numero: number; tipo: string; data: string
  status: string; totalValor: number; frete: number; outrasTaxas: number
  formaPagamento: string | null; observacao: string | null
  obsInternas: string | null; obsCliente: string | null
  cliente: { id: string; nome: string } | null
  fornecedor: { id: string; nome: string } | null
  transportadora: { id: string; nome: string } | null
  itens: ItemPedido[]
}

type Props = {
  pedidos: Pedido[]
  clientes: Cliente[]
  fornecedores: Fornecedor[]
  produtos: ProdutoSimples[]
  produtosPdv: Produto[]
}

export default function PedidosWrapper({ pedidos, clientes, fornecedores, produtos, produtosPdv }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('pdv')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #f3f4f6',
        background: 'white',
        borderRadius: '14px 14px 0 0',
        padding: '0 4px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        {([
          { key: 'pdv', label: 'PDV — Ponto de Venda' },
          { key: 'pedidos', label: 'Pedidos' },
        ] as { key: Tab; label: string }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '14px 24px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? `3px solid ${NAVY}` : '3px solid transparent',
              marginBottom: -2,
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? NAVY : '#6b7280',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ background: 'white', borderRadius: '0 0 14px 14px', padding: activeTab === 'pdv' ? 0 : 24, minHeight: 400 }}>
        {activeTab === 'pdv' ? (
          <PdvClient produtos={produtosPdv} clientes={clientes} />
        ) : (
          <PedidosClient
            pedidos={pedidos}
            clientes={clientes}
            fornecedores={fornecedores}
            produtos={produtos}
          />
        )}
      </div>
    </div>
  )
}
