'use client'
import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import SelecaoFechamentos from '@/components/selecao-fechamentos'

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: '#6b7280' }}>Carregando...</div>}>
      <SelecaoProdutor />
    </Suspense>
  )
}

function SelecaoProdutor() {
  const { produtorId } = useParams<{ produtorId: string }>()
  return <SelecaoFechamentos tipo="produtor" id={produtorId} />
}
