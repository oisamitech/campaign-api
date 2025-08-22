import { PrismaClient } from '@prisma/client'
import { logger } from '../../../config/logger.js'

export interface Rule {
  id: bigint
  campaignId: bigint
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
  deletedAt?: Date | null
}

export interface CreateRuleParams {
  campaignId: bigint
  minLives: number
  maxLives: number
  plans: number[]
  paymentMethod: string[]
  accommodation: string[]
  typeProduct: string[]
  obstetrics: string[]
  value: number
}

export interface UpdateRuleParams {
  minLives?: number
  maxLives?: number
  plans?: number[]
  paymentMethod?: string[]
  accommodation?: string[]
  typeProduct?: string[]
  obstetrics?: string[]
  value?: number
}

export interface RuleRepository {
  findByCampaignId(campaignId: string): Promise<Rule[]>
  findById(id: string): Promise<Rule | null>
  create(params: CreateRuleParams): Promise<Rule>
  update(id: string, params: UpdateRuleParams): Promise<Rule>
  delete(id: string): Promise<Rule>
  deleteByCampaignId(campaignId: string): Promise<void>
}

export class PrismaRuleRepository implements RuleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByCampaignId(campaignId: string): Promise<Rule[]> {
    return this.prisma.rule.findMany({
      where: {
        campaignId: BigInt(campaignId),
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
    }) as Promise<Rule[]>
  }

  async findById(id: string): Promise<Rule | null> {
    try {
      const rule = await this.prisma.rule.findUnique({
        where: {
          id: BigInt(id),
          deletedAt: null,
        },
      })
      return rule as Rule | null
    } catch (error) {
      logger.error({ error }, 'Error finding rule by id')
      return null
    }
  }

  async create(params: CreateRuleParams): Promise<Rule> {
    return this.prisma.rule.create({
      data: {
        campaignId: params.campaignId,
        minLives: params.minLives,
        maxLives: params.maxLives,
        plans: params.plans,
        paymentMethod: params.paymentMethod,
        accommodation: params.accommodation,
        typeProduct: params.typeProduct,
        obstetrics: params.obstetrics,
        value: params.value,
      },
    }) as Promise<Rule>
  }

  async update(id: string, params: UpdateRuleParams): Promise<Rule> {
    return this.prisma.rule.update({
      where: {
        id: BigInt(id),
        deletedAt: null,
      },
      data: {
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
    }) as Promise<Rule>
  }

  async delete(id: string): Promise<Rule> {
    return this.prisma.rule.update({
      where: {
        id: BigInt(id),
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    }) as Promise<Rule>
  }

  async deleteByCampaignId(campaignId: string): Promise<void> {
    await this.prisma.rule.updateMany({
      where: {
        campaignId: BigInt(campaignId),
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    })
  }
}
