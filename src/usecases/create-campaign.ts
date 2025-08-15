import {
  CampaignRepository,
  CreateCampaignParams,
  RuleRepository,
  CreateRuleParams,
} from '../infra/database/repositories/index.js'

export interface CreateCampaignRequest {
  name: string
  startDate: string
  endDate: string
  isDefault?: boolean
  status?: string
  rules: Array<{
    minLives: number
    maxLives: number
    plans: number[]
    value: number
    paymentMethod: string[]
    accommodation: string[]
    typeProduct: string[]
    obstetrics: string[]
  }>
}

export interface CreateCampaignResponse {
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

export interface CreateCampaignUseCase {
  execute(request: CreateCampaignRequest): Promise<CreateCampaignResponse>
}

export class CreateCampaignUseCaseImpl implements CreateCampaignUseCase {
  constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly ruleRepository: RuleRepository
  ) {}

  async execute(
    request: CreateCampaignRequest
  ): Promise<CreateCampaignResponse> {
    const startDate = new Date(request.startDate)
    const endDate = new Date(request.endDate)

    const createCampaignParams: CreateCampaignParams = {
      name: request.name.trim(),
      startDate,
      endDate,
      isDefault: request.isDefault ?? false,
      status: request.status ?? 'ACTIVE',
    }

    const campaign = await this.campaignRepository.create(createCampaignParams)

    const createdRules = []
    for (const ruleData of request.rules) {
      const createRuleParams: CreateRuleParams = {
        campaignId: campaign.id,
        minLives: ruleData.minLives,
        maxLives: ruleData.maxLives,
        plans: ruleData.plans,
        value: ruleData.value,
        paymentMethod: ruleData.paymentMethod,
        accommodation: ruleData.accommodation,
        typeProduct: ruleData.typeProduct,
        obstetrics: ruleData.obstetrics,
      }

      const rule = await this.ruleRepository.create(createRuleParams)
      createdRules.push(rule)
    }

    return {
      id: campaign.id.toString(),
      name: campaign.name,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      isDefault: campaign.isDefault,
      status: campaign.status,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
      rules: createdRules.map(rule => ({
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
    }
  }
}
