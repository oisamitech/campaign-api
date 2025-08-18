import { PrismaClient } from '@prisma/client'

// Interface da entidade Campaign refatorada
export interface Campaign {
  id: bigint
  name: string
  startDate: Date
  endDate: Date
  isDefault: boolean
  status: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

// Interface para Campaign com suas regras
export interface CampaignWithRules extends Campaign {
  rules: Array<{
    id: bigint
    minLives: number
    maxLives: number
    plans: number[]
    paymentMethod: string[]
    accommodation: string[]
    typeProduct: string[]
    obstetrics: string[]
    value: number
    createdAt: Date
    updatedAt: Date
  }>
}

export interface PaginationParams {
  page: number
  limit: number
}

// Interface para criação de campanha (sem as regras que são criadas separadamente)
export interface CreateCampaignParams {
  name: string
  startDate: Date
  endDate: Date
  isDefault?: boolean
  status?: string
}

// Interface para atualização de campanha
export interface UpdateCampaignParams {
  name?: string
  startDate?: Date
  endDate?: Date
  isDefault?: boolean
  status?: string
}

// Interface do repositório de campanha
export interface CampaignRepository {
  findManyPaginated(params: PaginationParams): Promise<Campaign[]>
  findManyPaginatedWithRules(
    params: PaginationParams
  ): Promise<CampaignWithRules[]>
  count(): Promise<number>
  create(params: CreateCampaignParams): Promise<Campaign>
  findById(id: string): Promise<Campaign | null>
  findByIdWithRules(id: string): Promise<CampaignWithRules | null>
  update(id: string, params: UpdateCampaignParams): Promise<Campaign>
  delete(id: string): Promise<Campaign>
  findOverlappingCampaigns(
    startDate: Date,
    endDate: Date,
    excludeId?: string
  ): Promise<Campaign[]>
}

// Implementação do repositório usando Prisma
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

  async findManyPaginatedWithRules(
    params: PaginationParams
  ): Promise<CampaignWithRules[]> {
    const { page, limit } = params
    const offset = (page - 1) * limit

    // Buscar todas as campanhas primeiro para aplicar ordenação customizada
    const allCampaigns = (await this.prisma.campaign.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        rules: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })) as CampaignWithRules[]

    // Aplicar ordenação customizada
    const currentDate = new Date()
    const sortedCampaigns = allCampaigns.sort((a, b) => {
      const isActiveA = a.startDate <= currentDate && a.endDate >= currentDate
      const isActiveB = b.startDate <= currentDate && b.endDate >= currentDate

      // Se ambas são ativas ou ambas são inativas, ordenar por data
      if (isActiveA === isActiveB) {
        if (isActiveA) {
          // Campanhas ativas: mais recente para mais distante (startDate DESC)
          return b.startDate.getTime() - a.startDate.getTime()
        } else {
          // Campanhas inativas: mais antiga para mais recente (startDate ASC)
          return a.startDate.getTime() - b.startDate.getTime()
        }
      }

      // Campanhas ativas sempre vêm primeiro
      return isActiveA ? -1 : 1
    })

    // Aplicar paginação após ordenação
    return sortedCampaigns.slice(offset, offset + limit)
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
        status: params.status ?? 'ACTIVE',
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

  async findByIdWithRules(id: string): Promise<CampaignWithRules | null> {
    try {
      const campaign = await this.prisma.campaign.findUnique({
        where: {
          id: BigInt(id),
          deletedAt: null,
        },
        include: {
          rules: {
            where: {
              deletedAt: null,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      })
      return campaign as CampaignWithRules | null
    } catch (error) {
      console.error('Error finding campaign with rules by id', error)
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
        ...(params.status !== undefined && { status: params.status }),
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

  async findOverlappingCampaigns(
    startDate: Date,
    endDate: Date,
    excludeId?: string
  ): Promise<Campaign[]> {
    return this.prisma.campaign.findMany({
      where: {
        deletedAt: null,
        ...(excludeId && { id: { not: BigInt(excludeId) } }),
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    })
  }
}
