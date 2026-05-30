'use client'
import { useState } from 'react'
import PdvClient from './pdv-client'
import ProdutosClient from './produtos-client'

const NAVY = '#2d3561'

type ProdutoCompleto = {
  id: string; nome: string; descricao: string | null; sku: string | null
  preco: number; precoVenda: number; precoPromocional: number; precoPdv: number
  unidade: string; categoria: string | null; fornecedorId: string | null
  localizacao: string | null; estoqueMinimo: number; estoqueMaximo: number
  ncm: string | null; cest: string | null; cfop: string | null
  peso: number | null; altura: number | null; largura: number | null
  dataValidade: string | null; observacao: string | null
  ativo: boolean; createdAt: string; estoque: number
}

type Cliente = { id: string; nome: string }

type Props = {
  produtos: ProdutoCompleto[]
  clientes: Cliente[]
}

type Tab = 'pdv' | 'catalogo'

export default function ProdutosWrapper({ produtos, clientes }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('pdv')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #f3f4f6',
        marginBottom: 0,
        background: 'white',
        borderRadius: '14px 14px 0 0',
        padding: '0 4px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        {([
          { key: 'pdv', label: 'PDV' },
          { key: 'catalogo', label: 'Catálogo de Produtos' },
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
              letterSpacing: activeTab === tab.key ? 0.1 : 0,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ background: 'white', borderRadius: '0 0 14px 14px', padding: activeTab === 'pdv' ? 0 : 24, minHeight: 400 }}>
        {activeTab === 'pdv' ? (
          <PdvClient produtos={produtos} clientes={clientes} />
        ) : (
          <ProdutosClient produtos={produtos} />
        )}
      </div>
    </div>
  )
}
