import { PrismaClient } from '@prisma/client'

export interface Campaign {
  id: bigint
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

export interface PaginationParams {
  page: number
  limit: number
}

export interface CreateCampaignParams {
  name: string
  startDate: Date
  endDate: Date
  isDefault?: boolean
  minLives: number
  maxLives: number
  plans: number[]
  value: number
}

export interface CampaignRepository {
  findManyPaginated(params: PaginationParams): Promise<Campaign[]>
  count(): Promise<number>
  create(params: CreateCampaignParams): Promise<Campaign>
}

export class PrismaCampaignRepository implements CampaignRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findManyPaginated(params: PaginationParams): Promise<Campaign[]> {
    const { page, limit } = params
    const offset = (page - 1) * limit

    return this.prisma.campaign.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      skip: offset,
      take: limit,
    })
  }

  async count(): Promise<number> {
    return this.prisma.campaign.count()
  }

  async create(params: CreateCampaignParams): Promise<Campaign> {
    return this.prisma.campaign.create({
      data: {
        name: params.name,
        startDate: params.startDate,
        endDate: params.endDate,
        isDefault: params.isDefault ?? false,
        minLives: params.minLives,
        maxLives: params.maxLives,
        plans: params.plans,
        value: params.value,
      },
    })
  }
}
