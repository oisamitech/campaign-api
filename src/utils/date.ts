export function isWithin30DaysAfterEnd(
  proposalDate: Date,
  campaignStartDate: Date,
  campaignEndDate: Date
): boolean {
  const proposalTime = proposalDate.getTime()
  const startTime = campaignStartDate.getTime()
  const endTime = campaignEndDate.getTime()

  const wasActiveOnProposalDate =
    proposalTime >= startTime && proposalTime <= endTime

  if (!wasActiveOnProposalDate) {
    return false
  }

  const currentDate = new Date()
  const thirtyDaysAfterEnd = new Date(campaignEndDate)
  thirtyDaysAfterEnd.setDate(thirtyDaysAfterEnd.getDate() + 30)

  return currentDate <= thirtyDaysAfterEnd
}

export function parseISODate(dateString: string): Date | null {
  try {
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}
