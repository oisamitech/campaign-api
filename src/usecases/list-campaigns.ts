import {
  CampaignRepository,
  PaginationParams,
} from '../infra/database/repositories/index.js'

export interface CampaignResponse {
  id: string
  name: string
  startDate: Date
  endDate: Date
  isDefault: boolean
  status: string
  createdAt: Date
  updatedAt: Date
  rules: Array<{
    id: string
    minLives: number
    maxLives: number
    plans: number[]
    value: number
    paymentMethod: string[]
    accommodation: string[]
    typeProduct: string[]
    obstetrics: string[]
    createdAt: Date
    updatedAt: Date
  }>
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
    const paginationParams: PaginationParams = {
      page: Math.max(1, params?.page ?? 1),
      limit: Math.min(100, Math.max(1, params?.limit ?? 10)),
    }

    const [campaigns, totalItems] = await Promise.all([
      this.campaignRepository.findManyPaginatedWithRules(paginationParams),
      this.campaignRepository.count(),
    ])

    const totalPages = Math.ceil(totalItems / paginationParams.limit)
    const hasNextPage = paginationParams.page < totalPages
    const hasPreviousPage = paginationParams.page > 1

    const meta: PaginationMeta = {
      currentPage: paginationParams.page,
      totalPages,
      totalItems,
      itemsPerPage: paginationParams.limit,
      hasNextPage,
      hasPreviousPage,
    }

    const data: CampaignResponse[] = campaigns.map(campaign => ({
      id: campaign.id.toString(),
      name: campaign.name,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      isDefault: campaign.isDefault,
      status: campaign.status,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
      rules: campaign.rules.map(rule => ({
        id: rule.id.toString(),
        minLives: rule.minLives,
        maxLives: rule.maxLives,
        plans: rule.plans as number[],
        value: rule.value,
        paymentMethod: rule.paymentMethod as string[],
        accommodation: rule.accommodation as string[],
        typeProduct: rule.typeProduct as string[],
        obstetrics: rule.obstetrics as string[],
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
      })),
    }))

    return {
      data,
      meta,
    }
  }
}
