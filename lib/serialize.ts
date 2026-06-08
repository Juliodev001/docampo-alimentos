/**
 * Converte recursivamente todos os campos Prisma.Decimal para number nativo
 * antes de serializar via NextResponse.json().
 * Necessário porque Prisma Decimal.toJSON() retorna string, quebrando o frontend.
 */
export function s<T>(data: T): T {
  if (data === null || data === undefined) return data
  // Prisma Decimal tem constructor.name === 'Decimal' e método toNumber()
  if (
    typeof data === 'object' &&
    data !== null &&
    'constructor' in data &&
    (data as { constructor: { name: string } }).constructor.name === 'Decimal' &&
    typeof (data as unknown as { toNumber?: () => number }).toNumber === 'function'
  ) {
    return (data as unknown as { toNumber: () => number }).toNumber() as unknown as T
  }
  if (Array.isArray(data)) return data.map(s) as unknown as T
  if (data instanceof Date) return data
  if (typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>).map(([k, v]) => [k, s(v)])
    ) as unknown as T
  }
  return data
}
