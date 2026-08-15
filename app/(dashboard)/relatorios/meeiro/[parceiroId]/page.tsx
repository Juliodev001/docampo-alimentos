'use client'
import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import SelecaoFechamentos from '@/components/selecao-fechamentos'

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: '#6b7280' }}>Carregando...</div>}>
      <SelecaoMeeiro />
    </Suspense>
  )
}

function SelecaoMeeiro() {
  const { parceiroId } = useParams<{ parceiroId: string }>()
  return <SelecaoFechamentos tipo="meeiro" id={parceiroId} />
}
