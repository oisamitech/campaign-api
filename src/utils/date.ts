export function getThirtyDaysAgo(fromDate: Date = new Date()): Date {
  const thirtyDaysAgo = new Date(fromDate)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  return thirtyDaysAgo
}

export function parseISODate(dateString: string): Date | null {
  try {
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}
