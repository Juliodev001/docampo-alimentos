/**
 * Converte recursivamente todos os campos Prisma.Decimal para number nativo
 * antes de serializar via NextResponse.json().
 * Necessário porque Prisma Decimal.toJSON() retorna string, quebrando o frontend.
 */
export function s<T>(data: T): T {
  if (data === null || data === undefined) return data
  if (data instanceof Date) return data
  // Prisma Decimal (decimal.js): detecta pelo método toNumber(), que é estável
  // mesmo quando o nome da classe é minificado no bundle do Prisma runtime.
  // (O check antigo por constructor.name === 'Decimal' falhava no bundle.)
  if (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as { toNumber?: unknown }).toNumber === 'function'
  ) {
    return (data as unknown as { toNumber: () => number }).toNumber() as unknown as T
  }
  if (Array.isArray(data)) return data.map(s) as unknown as T
  if (typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>).map(([k, v]) => [k, s(v)])
    ) as unknown as T
  }
  return data
}
