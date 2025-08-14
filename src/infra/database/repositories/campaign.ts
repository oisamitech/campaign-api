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
  paymentMethod: any
  accommodation: any
  typeProduct: any
  obstetrics: any
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
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
  paymentMethod: string[]
  accommodation: string[]
  typeProduct: string[]
  obstetrics: string[]
}

export interface UpdateCampaignParams {
  name?: string
  startDate?: Date
  endDate?: Date
  isDefault?: boolean
  minLives?: number
  maxLives?: number
  plans?: number[]
  value?: number
  paymentMethod?: string[]
  accommodation?: string[]
  typeProduct?: string[]
  obstetrics?: string[]
}

export interface CampaignRepository {
  findManyPaginated(params: PaginationParams): Promise<Campaign[]>
  count(): Promise<number>
  create(params: CreateCampaignParams): Promise<Campaign>
  findById(id: string): Promise<Campaign | null>
  update(id: string, params: UpdateCampaignParams): Promise<Campaign>
  delete(id: string): Promise<Campaign>
}

export class PrismaCampaignRepository implements CampaignRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findManyPaginated(params: PaginationParams): Promise<Campaign[]> {
    const { page, limit } = params
    const offset = (page - 1) * limit

    return this.prisma.campaign.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: offset,
      take: limit,
    })
  }

  async count(): Promise<number> {
    return this.prisma.campaign.count({
      where: {
        deletedAt: null,
      },
    })
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
        paymentMethod: params.paymentMethod,
        accommodation: params.accommodation,
        typeProduct: params.typeProduct,
        obstetrics: params.obstetrics,
      },
    })
  }

  async findById(id: string): Promise<Campaign | null> {
    try {
      const campaign = await this.prisma.campaign.findUnique({
        where: {
          id: BigInt(id),
          deletedAt: null,
        },
      })
      return campaign
    } catch (error) {
      console.error('Error finding campaign by id', error)
      return null
    }
  }

  async update(id: string, params: UpdateCampaignParams): Promise<Campaign> {
    return this.prisma.campaign.update({
      where: {
        id: BigInt(id),
        deletedAt: null,
      },
      data: {
        ...(params.name !== undefined && { name: params.name }),
        ...(params.startDate !== undefined && { startDate: params.startDate }),
        ...(params.endDate !== undefined && { endDate: params.endDate }),
        ...(params.isDefault !== undefined && { isDefault: params.isDefault }),
        ...(params.minLives !== undefined && { minLives: params.minLives }),
        ...(params.maxLives !== undefined && { maxLives: params.maxLives }),
        ...(params.plans !== undefined && { plans: params.plans }),
        ...(params.value !== undefined && { value: params.value }),
        ...(params.paymentMethod !== undefined && {
          paymentMethod: params.paymentMethod,
        }),
        ...(params.accommodation !== undefined && {
          accommodation: params.accommodation,
        }),
        ...(params.typeProduct !== undefined && {
          typeProduct: params.typeProduct,
        }),
        ...(params.obstetrics !== undefined && {
          obstetrics: params.obstetrics,
        }),
      },
    })
  }

  async delete(id: string): Promise<Campaign> {
    return this.prisma.campaign.update({
      where: {
        id: BigInt(id),
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    })
  }
}
