import {
  CampaignRepository,
  CreateCampaignParams,
} from '../infra/database/repositories/index.js'

export interface CreateCampaignRequest {
  name: string
  startDate: string
  endDate: string
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

export interface CreateCampaignResponse {
  id: string
  name: string
  startDate: Date
  endDate: Date
  isDefault: boolean
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
}

export interface CreateCampaignUseCase {
  execute(request: CreateCampaignRequest): Promise<CreateCampaignResponse>
}

export class CreateCampaignUseCaseImpl implements CreateCampaignUseCase {
  constructor(private readonly campaignRepository: CampaignRepository) {}

  async execute(request: CreateCampaignRequest): Promise<CreateCampaignResponse> {
    // Validar datas
    const startDate = new Date(request.startDate)
    const endDate = new Date(request.endDate)

    if (isNaN(startDate.getTime())) {
      throw new Error('Invalid start date format')
    }

    if (isNaN(endDate.getTime())) {
      throw new Error('Invalid end date format')
    }

    if (startDate >= endDate) {
      throw new Error('Start date must be before end date')
    }

    // Validar lives
    if (request.minLives <= 0) {
      throw new Error('Minimum lives must be greater than 0')
    }

    if (request.maxLives <= 0) {
      throw new Error('Maximum lives must be greater than 0')
    }

    if (request.minLives > request.maxLives) {
      throw new Error('Minimum lives cannot be greater than maximum lives')
    }

    // Validar value (porcentagem)
    if (request.value < 1 || request.value > 100) {
      throw new Error('Value must be between 1 and 100')
    }

    // Validar plans
    if (!Array.isArray(request.plans) || request.plans.length === 0) {
      throw new Error('Plans must be a non-empty array')
    }

    if (request.plans.some(plan => typeof plan !== 'number' || plan <= 0)) {
      throw new Error('All plans must be positive numbers')
    }

    // Validar nome
    if (!request.name || request.name.trim().length === 0) {
      throw new Error('Campaign name is required')
    }

    if (request.name.trim().length > 255) {
      throw new Error('Campaign name must be 255 characters or less')
    }

    const createParams: CreateCampaignParams = {
      name: request.name.trim(),
      startDate,
      endDate,
      isDefault: request.isDefault ?? false,
      minLives: request.minLives,
      maxLives: request.maxLives,
      plans: request.plans,
      value: request.value,
      paymentMethod: request.paymentMethod,
      accommodation: request.accommodation,
      typeProduct: request.typeProduct,
      obstetrics: request.obstetrics,
    }

    const campaign = await this.campaignRepository.create(createParams)

    return {
      id: campaign.id.toString(),
      name: campaign.name,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      isDefault: campaign.isDefault,
      minLives: campaign.minLives,
      maxLives: campaign.maxLives,
      plans: campaign.plans as number[],
      value: campaign.value,
      paymentMethod: campaign.paymentMethod as string[],
      accommodation: campaign.accommodation as string[],
      typeProduct: campaign.typeProduct as string[],
      obstetrics: campaign.obstetrics as string[],
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    }
  }
}
