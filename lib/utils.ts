import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(date))
}

/**
 * Data de HOJE no fuso do Brasil, no formato "AAAA-MM-DD".
 *
 * Use isto como valor inicial de <input type="date"> e default de lançamento.
 * `new Date().toISOString().slice(0,10)` devolve a data em UTC: depois das 21h
 * (horário de Brasília) já virou o dia seguinte, e a venda/compra da noite
 * acabava datada no dia errado — some do dashboard do dia e só reaparece
 * "quando a data vira". Fixar America/Sao_Paulo resolve independentemente do
 * fuso da máquina.
 */
export function hojeISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

export function formatCPF(cpf: string | null | undefined): string {
  if (!cpf) return ''
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function isVencido(vencimento: Date, status: string): boolean {
  return status !== 'PAGO' && new Date(vencimento) < new Date()
}
