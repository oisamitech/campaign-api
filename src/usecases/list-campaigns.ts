import { CampaignRepository, PaginationParams } from '../infra/database/repositories/index.js'


export { PaginationParams }

export interface CampaignResponse {
  id: string
  name: string
  startDate: Date
  endDate: Date
  isDefault: boolean
  minLives: number
  maxLives: number
  plans: any
  value: number
  createdAt: Date
  updatedAt: Date
}

export interface PaginationMeta {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface PaginatedCampaignsResponse {
  data: CampaignResponse[]
  meta: PaginationMeta
}

export interface ListCampaignsUseCase {
  execute(params?: PaginationParams): Promise<PaginatedCampaignsResponse>
}

export class ListCampaignsUseCaseImpl implements ListCampaignsUseCase {
  constructor(private readonly campaignRepository: CampaignRepository) {}

  async execute(
    params?: PaginationParams
  ): Promise<PaginatedCampaignsResponse> {
    try {
      const { page = 1, limit = 10 } = params || {}

      const validPage = Math.max(1, page)
      const validLimit = Math.min(Math.max(1, limit), 100)

      const [campaigns, totalItems] = await Promise.all([
        this.campaignRepository.findManyPaginated({
          page: validPage,
          limit: validLimit,
        }),
        this.campaignRepository.count(),
      ])

      const totalPages = Math.ceil(totalItems / validLimit)
      const hasNextPage = validPage < totalPages
      const hasPreviousPage = validPage > 1

      const campaignsData = campaigns.map(campaign => ({
        ...campaign,
        id: campaign.id.toString(),
      }))

      return {
        data: campaignsData,
        meta: {
          currentPage: validPage,
          totalPages,
          totalItems,
          itemsPerPage: validLimit,
          hasNextPage,
          hasPreviousPage,
        },
      }
    } catch (error) {
      throw new Error(
        `Failed to list campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}
