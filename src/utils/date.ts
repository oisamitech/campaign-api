export function getThirtyDaysAgo(fromDate: Date = new Date()): Date {
  const thirtyDaysAgo = new Date(fromDate)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  return thirtyDaysAgo
}

export function parseISODate(dateString: string): Date | null {
  const date = new Date(dateString)
  return isNaN(date.getTime()) ? null : date
}

/**
 * Normaliza uma data para o horário de 03:00 UTC (horário padrão das campanhas no banco)
 * Isso resolve o problema de comparação entre datas que vêm com 00:00 vs 03:00
 */
export function normalizeDateToCampaignTime(date: Date): Date {
  const normalizedDate = new Date(date)
  normalizedDate.setUTCHours(3, 0, 0, 0)
  return normalizedDate
}